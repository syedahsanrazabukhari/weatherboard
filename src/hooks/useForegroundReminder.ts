/**
 * Foreground Weather Reminder Hook
 *
 * Dispatches the daily weather reminder while the app is open in a browser tab.
 * Checks on load, on document `visibilitychange`, and sets a `setTimeout` to the
 * next scheduled reminder time.
 *
 * ARCHITECTURAL LIMITATION:
 * True Web Push at an exact time requires a backend push server.
 * Periodic Background Sync is Chromium-only, requires an installed PWA, and
 * the browser decides the actual execution window.
 * This hook acts as the foreground counterpart, guaranteeing delivery whenever
 * the user has WeatherBoard open or running in an open tab at their reminder time.
 */

import { useEffect, useRef } from 'react'
import { getPermission, showWeatherNotification } from '../lib/notifications'
import {
  getLastNotifiedDate,
  getReminderSettings,
  setLastNotifiedDate,
} from '../lib/reminderStore'
import {
  fetchReminderWeather,
  formatReminderNotification,
  getMsUntilNextReminder,
  getTodayLocalDateString,
  isTimeAtOrAfter,
} from '../lib/weatherReminderNotification'

export function useForegroundReminder(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCheckingRef = useRef<boolean>(false)

  useEffect(() => {
    async function checkAndTriggerReminder(): Promise<void> {
      if (isCheckingRef.current) return
      isCheckingRef.current = true

      try {
        if (getPermission() !== 'granted') {
          return
        }

        const settings = await getReminderSettings()
        if (!settings || !settings.enabled) {
          return
        }

        const todayStr = getTodayLocalDateString()
        const lastNotified = await getLastNotifiedDate()

        // Only notify once per calendar day
        if (lastNotified === todayStr) {
          return
        }

        // Check if the current time has reached or passed the scheduled time
        if (!isTimeAtOrAfter(settings.time)) {
          return
        }

        // Fetch conditions and display notification
        const weatherData = await fetchReminderWeather(settings.lat, settings.lon)
        const { title, body } = formatReminderNotification(settings.cityName, weatherData)

        const displayed = await showWeatherNotification(title, body)
        if (displayed) {
          await setLastNotifiedDate(todayStr)
        }
      } catch (error) {
        console.warn('[ForegroundReminder] Check failed:', error)
      } finally {
        isCheckingRef.current = false
      }
    }

    async function scheduleNextTimer(): Promise<void> {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      const settings = await getReminderSettings()
      if (!settings || !settings.enabled) {
        return
      }

      const msUntilNext = getMsUntilNextReminder(settings.time)

      timerRef.current = setTimeout(async () => {
        await checkAndTriggerReminder()
        void scheduleNextTimer()
      }, msUntilNext)
    }

    // 1. Check immediately on mount/load
    void checkAndTriggerReminder().then(() => {
      void scheduleNextTimer()
    })

    // 2. Check on visibilitychange (e.g. user returns to the tab or unminimizes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkAndTriggerReminder()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3. Fallback interval check every 60 seconds to catch system sleep wakeups
    const intervalId = setInterval(() => {
      void checkAndTriggerReminder()
    }, 60_000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
