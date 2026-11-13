import React, { useEffect, useId, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  Radio,
  Send,
} from 'lucide-react'
import {
  getPermission,
  NotificationPermissionStatus,
  requestPermission,
  showWeatherNotification,
} from '../lib/notifications'
import {
  isDailyPeriodicSyncActive,
  registerDailyPeriodicSync,
  unregisterDailyPeriodicSync,
} from '../lib/periodicSync'
import {
  DEFAULT_REMINDER_TIME,
  getReminderSettings,
  ReminderSettings as ReminderSettingsData,
  setReminderSettings,
} from '../lib/reminderStore'
import { City, WeatherReport } from '../types'

interface ReminderSettingsProps {
  city: City | null
  currentReport: WeatherReport | null
}

type PeriodicSyncStatus = 'active' | 'unsupported_or_failed' | null

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({
  city,
  currentReport,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('unsupported')
  const [enabled, setEnabled] = useState<boolean>(false)
  const [time, setTime] = useState<string>(DEFAULT_REMINDER_TIME)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [savedCityName, setSavedCityName] = useState<string | null>(null)
  const [isExplaining, setIsExplaining] = useState<boolean>(false)
  const [testSent, setTestSent] = useState<boolean>(false)
  const [periodicSyncStatus, setPeriodicSyncStatus] = useState<PeriodicSyncStatus>(null)

  const timeInputId = useId()
  const errorId = useId()
  const activeCityName = city?.name || savedCityName || 'your city'

  // Initialize permission and read stored settings
  useEffect(() => {
    const currentPerm = getPermission()
    setPermission(currentPerm)

    async function loadSettings() {
      const stored = await getReminderSettings()
      if (stored) {
        setEnabled(stored.enabled)
        setTime(stored.time || DEFAULT_REMINDER_TIME)
        setSavedCityName(stored.cityName)

        if (stored.enabled && currentPerm === 'granted') {
          const isActive = await isDailyPeriodicSyncActive()
          if (isActive) {
            setPeriodicSyncStatus('active')
          } else {
            const regResult = await registerDailyPeriodicSync()
            setPeriodicSyncStatus(regResult ? 'active' : 'unsupported_or_failed')
          }
        }
      }
    }
    void loadSettings()

    // Re-check permission if the user updates browser settings and refocuses the tab
    const handleFocus = () => {
      setPermission(getPermission())
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const validateTime = (val: string): string | null => {
    const trimmed = val.trim()
    if (!trimmed) {
      return 'Please enter a reminder time.'
    }
    if (!TIME_REGEX.test(trimmed)) {
      return 'Enter a valid 24-hour time (HH:mm, e.g. 08:00).'
    }
    return null
  }

  const persistSettings = async (
    nextEnabled: boolean,
    nextTime: string,
    targetCity: City | null
  ) => {
    if (!targetCity) return

    const data: ReminderSettingsData = {
      enabled: nextEnabled,
      time: nextTime,
      cityId: targetCity.id,
      cityName: targetCity.name,
      lat: targetCity.latitude,
      lon: targetCity.longitude,
    }
    await setReminderSettings(data)
    setSavedCityName(targetCity.name)

    // Register or unregister Periodic Background Sync according to state
    if (nextEnabled && permission === 'granted') {
      const syncRegistered = await registerDailyPeriodicSync()
      setPeriodicSyncStatus(syncRegistered ? 'active' : 'unsupported_or_failed')
    } else if (!nextEnabled) {
      await unregisterDailyPeriodicSync()
      setPeriodicSyncStatus(null)
    }
  }

  const handleToggle = async () => {
    if (permission === 'unsupported' || permission === 'denied') {
      return
    }

    if (enabled) {
      // Toggling OFF
      setEnabled(false)
      if (city) {
        await persistSettings(false, time, city)
      }
      return
    }

    // Toggling ON
    const err = validateTime(time)
    if (err) {
      setTimeError(err)
      return
    }
    setTimeError(null)

    if (permission === 'default') {
      // Show explanation step in our own UI before triggering browser prompt
      setIsExplaining(true)
      return
    }

    if (permission === 'granted') {
      setEnabled(true)
      if (city) {
        await persistSettings(true, time, city)
      }
    }
  }

  const handleExplanationContinue = async () => {
    setIsExplaining(false)
    const result = await requestPermission()
    setPermission(result)

    if (result === 'granted') {
      setEnabled(true)
      if (city) {
        await persistSettings(true, time, city)
      }
    } else {
      setEnabled(false)
    }
  }

  const handleExplanationDismiss = () => {
    setIsExplaining(false)
    setEnabled(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value
    setTime(nextVal)
    if (timeError) {
      setTimeError(validateTime(nextVal))
    }
  }

  const handleTimeBlur = async () => {
    const err = validateTime(time)
    setTimeError(err)

    if (!err && enabled && city) {
      await persistSettings(true, time, city)
    }
  }

  const handleUpdateCity = async () => {
    if (!city) return
    await persistSettings(enabled, time, city)
  }

  const handleSendTestNotification = async () => {
    if (!city || permission !== 'granted') return

    let title = `${city.name} Weather`
    let body = 'Weather notifications are active.'

    if (currentReport) {
      const temp = Math.round(currentReport.current.tempC)
      const desc = currentReport.current.description
      const todayForecast = currentReport.daily[0]
      const high = todayForecast ? `${Math.round(todayForecast.maxC)}°` : `${temp}°`
      const low = todayForecast ? `${Math.round(todayForecast.minC)}°` : `${temp}°`
      title = `${city.name}: ${temp}°C, ${desc}`
      body = `High ${high}, low ${low}. Wind: ${Math.round(currentReport.current.windSpeedMs * 3.6)} km/h.`
    }

    const success = await showWeatherNotification(title, body)
    if (success) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    }
  }

  const isToggleDisabled = permission === 'unsupported' || permission === 'denied' || !city

  return (
    <section
      aria-label="Daily Weather Reminder Settings"
      className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-5 backdrop-blur-md shadow-xl"
    >
      {/* Header with Title and Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            {enabled ? (
              <BellRing className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Bell className="h-4 w-4 text-slate-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-slate-100 sm:text-base truncate">
              Daily morning reminder
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {city ? `For ${city.name}` : 'Select a city to configure'}
            </p>
          </div>
        </div>

        {/* Accessible Switch Toggle (min 44px touch target) */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle daily morning reminder"
          disabled={isToggleDisabled}
          onClick={handleToggle}
          className={`relative inline-flex h-11 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
            isToggleDisabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {/* Switch Track */}
          <span
            className={`pointer-events-none inline-block h-6 w-11 rounded-full border transition-colors ${
              enabled
                ? 'border-cyan-500 bg-cyan-600'
                : 'border-slate-700 bg-slate-800'
            }`}
          >
            {/* Switch Knob */}
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                enabled ? 'translate-x-5 translate-y-0.5' : 'translate-x-0.5 translate-y-0.5'
              }`}
            />
          </span>
        </button>
      </div>

      {/* Pre-Permission Explanation UI Step */}
      {isExplaining && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="notification-explainer-title"
          className="mt-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 animate-fadeIn"
        >
          <div className="flex items-start gap-2.5">
            <BellRing className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3
                id="notification-explainer-title"
                className="text-xs font-semibold text-cyan-200 sm:text-sm"
              >
                Allow Morning Weather Notifications
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                WeatherBoard will send you one notification each morning with the weather for{' '}
                <strong className="text-white font-medium">{activeCityName}</strong>. Your browser
                will now ask for permission.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExplanationContinue}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-cyan-500 active:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleExplanationDismiss}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-750 active:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Notice: Unsupported Browser */}
      {permission === 'unsupported' && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
          <p>
            Your browser doesn&apos;t support notifications. Try Chrome or Edge on desktop or
            Android.
          </p>
        </div>
      )}

      {/* State Notice: Permission Denied */}
      {permission === 'denied' && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
        >
          <BellOff className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
          <p>
            Notifications are blocked. Enable them in your browser&apos;s site settings, then come
            back.
          </p>
        </div>
      )}

      {/* State Notice: Permission Granted & Active Reminder Details */}
      {permission === 'granted' && enabled && savedCityName && (
        <div
          role="status"
          className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
        >
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="truncate">
              Reminder set for <strong className="font-semibold text-emerald-200">{time}</strong> daily
              for <strong className="font-semibold text-emerald-200">{savedCityName}</strong>
            </span>
          </div>

          {/* Prompt to update to currently selected city if different */}
          {city && city.name !== savedCityName && (
            <button
              type="button"
              onClick={handleUpdateCity}
              className="shrink-0 text-[11px] font-medium text-cyan-400 underline hover:text-cyan-300 focus:outline-none"
            >
              Update to {city.name}
            </button>
          )}
        </div>
      )}

      {/* Time Configuration Controls */}
      <div className="mt-3.5 space-y-3">
        <div>
          <label
            htmlFor={timeInputId}
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Reminder time (24h)
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
            <input
              id={timeInputId}
              type="time"
              value={time}
              onChange={handleTimeChange}
              onBlur={handleTimeBlur}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? errorId : undefined}
              disabled={isToggleDisabled}
              className={`w-full min-h-[44px] rounded-xl border bg-slate-900/90 pl-9 pr-3 py-2 text-sm text-slate-100 outline-none transition-all focus:ring-2 ${
                timeError
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:border-cyan-500/60 focus:ring-cyan-500/20'
              } ${isToggleDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Validation Error Message */}
          {timeError && (
            <p
              id={errorId}
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-400 animate-fadeIn"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{timeError}</span>
            </p>
          )}
        </div>

        {/* Send Test Notification Button (only visible when permission is granted) */}
        {permission === 'granted' && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={!city}
              aria-label="Send test weather notification now"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-750 active:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Test notification sent!</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Send test notification</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Periodic Background Sync Status Line */}
        {enabled && periodicSyncStatus === 'active' && (
          <p className="text-[11px] text-emerald-400/90 flex items-center gap-1.5 pt-0.5">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" aria-hidden="true" />
            <span>Background reminders are active</span>
          </p>
        )}

        {enabled && periodicSyncStatus === 'unsupported_or_failed' && (
          <p className="text-[11px] text-slate-400 leading-relaxed pt-0.5">
            Your browser can&apos;t run background reminders. Keep WeatherBoard open (or installed)
            at your reminder time to receive it.
          </p>
        )}
      </div>
    </section>
  )
}
