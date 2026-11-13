
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

    const handleFocus = () => {
      setPermission(getPermission())
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const validateTime = (val: string): string | null => {
    const trimmed = val.trim()
    if (!trimmed) return 'Please enter a reminder time.'
    if (!TIME_REGEX.test(trimmed)) return 'Enter a valid 24-hour time (HH:mm, e.g. 08:00).'
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

    if (nextEnabled && permission === 'granted') {
      const syncRegistered = await registerDailyPeriodicSync()
      setPeriodicSyncStatus(syncRegistered ? 'active' : 'unsupported_or_failed')
    } else if (!nextEnabled) {
      await unregisterDailyPeriodicSync()
      setPeriodicSyncStatus(null)
    }
  }

  const handleToggle = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    if (enabled) {
      setEnabled(false)
      if (city) await persistSettings(false, time, city)
      return
    }

    const err = validateTime(time)
    if (err) {
      setTimeError(err)
      return
    }

    setTimeError(null)

    if (permission === 'default') {
      setIsExplaining(true)
      return
    }

    if (permission === 'granted') {
      setEnabled(true)
      if (city) await persistSettings(true, time, city)
    }
  }

  const handleExplanationContinue = async () => {
    setIsExplaining(false)
    const result = await requestPermission()
    setPermission(result)

    if (result === 'granted') {
      setEnabled(true)
      if (city) await persistSettings(true, time, city)
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
    if (timeError) setTimeError(validateTime(nextVal))
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
      className="rounded-2xl border border-white/[0.09] bg-[#111] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            enabled
              ? 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300'
              : 'border-white/[0.08] bg-[#202020] text-[#999]'
          }`}>
            {enabled ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">Daily morning reminder</h2>
            <p className="mt-0.5 truncate text-[11px] text-[#777]">
              {city ? `For ${city.name}` : 'Select a city to configure'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle daily morning reminder"
          disabled={isToggleDisabled}
          onClick={handleToggle}
          className={`relative inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-white/20 ${
            isToggleDisabled ? 'cursor-not-allowed opacity-40' : ''
          }`}
        >
          <span className={`inline-block h-6 w-11 rounded-full border transition-colors ${
            enabled ? 'border-[#c5a779] bg-[#9d8055]' : 'border-white/10 bg-[#292929]'
          }`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5 translate-y-0.5' : 'translate-x-0.5 translate-y-0.5'
            }`} />
          </span>
        </button>
      </div>

      {isExplaining && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="notification-explainer-title"
          className="mt-4 rounded-xl border border-amber-400/20 bg-[#211c14] p-4 animate-fadeIn"
        >
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <h3 id="notification-explainer-title" className="text-sm font-semibold text-amber-100">
                Allow Morning Weather Notifications
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#c1b9aa]">
                WeatherBoard will send you one notification each morning with the weather for{' '}
                <strong className="font-semibold text-white">{activeCityName}</strong>. Your browser
                will now ask for permission.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExplanationContinue}
                  className="min-h-[42px] rounded-lg bg-[#c0a174] px-4 py-2 text-xs font-semibold text-[#17120b] transition hover:bg-[#d0b58c] focus:outline-none focus:ring-2 focus:ring-amber-300/30"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleExplanationDismiss}
                  className="min-h-[42px] rounded-lg border border-white/10 bg-[#252525] px-4 py-2 text-xs font-medium text-[#ccc] transition hover:bg-[#303030]"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {permission === 'unsupported' && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>Your browser doesn&apos;t support notifications. Try Chrome or Edge on desktop or Android.</p>
        </div>
      )}

      {permission === 'denied' && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs leading-5 text-rose-300">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>Notifications are blocked. Enable them in your browser&apos;s site settings, then come back.</p>
        </div>
      )}

      {permission === 'granted' && enabled && savedCityName && (
        <div role="status" className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs text-emerald-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span className="min-w-0 flex-1 leading-5">
              Reminder set for <strong className="text-emerald-100">{time}</strong> daily for{' '}
              <strong className="text-emerald-100">{savedCityName}</strong>
            </span>
          </div>
          {city && city.name !== savedCityName && (
            <button
              type="button"
              onClick={handleUpdateCity}
              className="ml-6 mt-2 text-[11px] font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              Update to {city.name}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor={timeInputId} className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#888]">
            Reminder time · 24-hour format
          </label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
            <input
              id={timeInputId}
              type="time"
              value={time}
              onChange={handleTimeChange}
              onBlur={handleTimeBlur}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? errorId : undefined}
              disabled={isToggleDisabled}
              className={`min-h-[46px] w-full rounded-lg border bg-[#191919] py-2 pl-10 pr-3 text-sm text-white outline-none transition focus:ring-2 ${
                timeError
                  ? 'border-rose-500/70 focus:ring-rose-500/15'
                  : 'border-white/[0.09] focus:border-white/25 focus:ring-white/10'
              } ${isToggleDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
            />
          </div>
          {timeError && (
            <p id={errorId} role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {timeError}
            </p>
          )}
        </div>

        {permission === 'granted' && (
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={!city}
            aria-label="Send test weather notification now"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#222] px-4 py-2.5 text-xs font-semibold text-[#ddd] transition hover:border-white/20 hover:bg-[#2b2b2b] focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {testSent ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300">Test notification sent!</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 text-[#999]" />
                <span>Send test notification</span>
              </>
            )}
          </button>
        )}

        {enabled && periodicSyncStatus === 'active' && (
          <p className="flex items-center gap-2 text-[11px] text-emerald-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Background reminders are active
          </p>
        )}

        {enabled && periodicSyncStatus === 'unsupported_or_failed' && (
          <p className="text-[11px] leading-5 text-[#888]">
            Your browser can&apos;t run background reminders. Keep WeatherBoard open (or installed)
            at your reminder time to receive it.
          </p>
        )}
      </div>
    </section>
  )
}
