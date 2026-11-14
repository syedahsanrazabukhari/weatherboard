
/**
 * Foreground Weather Reminder Hook
 *
 * Handles multiple reminders while WeatherBoard is open.
 */

import { useEffect, useRef } from 'react'

import {
  getPermission,
  showWeatherNotification,
} from '../lib/notifications'

import {
  getReminderLastNotifiedDate,
  getReminderSettings,
  setReminderLastNotifiedDate,
} from '../lib/reminderStore'

import {
  fetchReminderWeather,
  formatReminderNotification,
  getMsUntilNextScheduledReminder,
  getTodayLocalDateString,
  isReminderDue,
} from '../lib/weatherReminderNotification'

const REMINDERS_UPDATED_EVENT = 'weatherboard:reminders-updated'

export function useForegroundReminder(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function checkAndTriggerReminders(): Promise<void> {
      if (isCheckingRef.current || !mounted) return

      isCheckingRef.current = true

      try {
        if (getPermission() !== 'granted') return

        const reminders = await getReminderSettings()
        const today = getTodayLocalDateString()

        for (const reminder of reminders) {
          if (!mounted) return

          if (!reminder.enabled || reminder.days.length === 0) {
            continue
          }

          if (!isReminderDue(reminder.time, reminder.days)) {
            continue
          }

          // Every reminder has independent notification history.
          const lastNotified = await getReminderLastNotifiedDate(
            reminder.id
          )

          if (lastNotified === today) {
            continue
          }

          const weatherData = await fetchReminderWeather(
            reminder.lat,
            reminder.lon
          )

          if (!mounted) return

          const { title, body } = formatReminderNotification(
            reminder.cityName,
            weatherData,
            reminder.unit ?? 'c'
          )

          const displayed = await showWeatherNotification(
            title,
            body,
            {
              tag: `weatherboard-reminder-${reminder.id}`,
            }
          )

          if (displayed) {
            await setReminderLastNotifiedDate(
              reminder.id,
              today
            )
          }
        }
      } catch (error) {
        console.warn(
          '[ForegroundReminder] Reminder processing failed:',
          error
        )
      } finally {
        isCheckingRef.current = false
      }
    }

    async function scheduleNextTimer(): Promise<void> {
      if (!mounted) return

      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      try {
        const reminders = await getReminderSettings()

        if (!mounted) return

        const activeReminders = reminders.filter(
          (reminder) =>
            reminder.enabled &&
            reminder.days.length > 0
        )

        if (activeReminders.length === 0) return

        const delays = activeReminders.map((reminder) =>
          getMsUntilNextScheduledReminder(
            reminder.time,
            reminder.days
          )
        )

        const nextDelay = Math.min(...delays)

        timerRef.current = setTimeout(async () => {
          await checkAndTriggerReminders()

          if (mounted) {
            void scheduleNextTimer()
          }
        }, nextDelay)
      } catch (error) {
        console.warn(
          '[ForegroundReminder] Scheduling failed:',
          error
        )
      }
    }

    async function refreshReminders(): Promise<void> {
      await checkAndTriggerReminders()

      if (mounted) {
        await scheduleNextTimer()
      }
    }

    // Initial check when the app opens.
    void refreshReminders()

    // Recheck when the user returns to the application.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshReminders()
      }
    }

    // Recalculate scheduling after settings changes.
    const handleRemindersUpdated = () => {
      void refreshReminders()
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    window.addEventListener(
      REMINDERS_UPDATED_EVENT,
      handleRemindersUpdated
    )

    // Catch wakeups and delayed timers.
    const intervalId = setInterval(() => {
      void checkAndTriggerReminders()
    }, 60_000)

    return () => {
      mounted = false

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      clearInterval(intervalId)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )

      window.removeEventListener(
        REMINDERS_UPDATED_EVENT,
        handleRemindersUpdated
      )
    }
  }, [])
}
