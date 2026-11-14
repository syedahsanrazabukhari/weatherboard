
import React, { useEffect, useId, useState } from 'react'

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
  Send,
  Trash2,
  Pencil,
  X,
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

import { WEEKDAYS } from '../lib/weatherReminderNotification'

import { City, WeatherReport } from '../types'

interface ReminderSettingsProps {
  city: City | null
  currentReport: WeatherReport | null
}

type PeriodicSyncStatus =
  | 'active'
  | 'unsupported_or_failed'
  | null

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const UPDATED_EVENT = 'weatherboard:reminders-updated'

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({
  city,
  currentReport,
}) => {
  const [permission, setPermission] =
    useState<NotificationPermissionStatus>('unsupported')

  const [reminders, setReminders] =
    useState<ReminderSettingsData[]>([])

  const [loading, setLoading] = useState(true)

  const [time, setTime] = useState(DEFAULT_REMINDER_TIME)

  const [days, setDays] = useState<number[]>([])

  const [timeError, setTimeError] = useState<string | null>(null)

  const [daysError, setDaysError] = useState<string | null>(null)

  const [isExplaining, setIsExplaining] = useState(false)

  const [testSent, setTestSent] = useState(false)

  const [periodicSyncStatus, setPeriodicSyncStatus] =
    useState<PeriodicSyncStatus>(null)

  const [editingId, setEditingId] = useState<string | null>(null)

  const [editingTime, setEditingTime] = useState('')

  const [editingDays, setEditingDays] = useState<number[]>([])

  const [editingError, setEditingError] = useState<string | null>(null)

  const [storageError, setStorageError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const timeInputId = useId()
  const errorId = useId()

  const activeCityName = city?.name || 'your selected city'

  useEffect(() => {
    let mounted = true

    async function loadSettings() {
      const currentPermission = getPermission()

      if (mounted) {
        setPermission(currentPermission)
      }

      try {
        const stored = await getReminderSettings()

        if (!mounted) return

        setReminders(stored)

        if (
          stored.some((reminder) => reminder.enabled) &&
          currentPermission === 'granted'
        ) {
          const active = await isDailyPeriodicSyncActive()

          if (!mounted) return

          if (active) {
            setPeriodicSyncStatus('active')
          } else {
            const registered = await registerDailyPeriodicSync()

            if (mounted) {
              setPeriodicSyncStatus(
                registered ? 'active' : 'unsupported_or_failed'
              )
            }
          }
        }
      } catch (error) {
        console.warn('[ReminderSettings] Loading failed:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadSettings()

    const handleFocus = () => {
      setPermission(getPermission())
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      mounted = false
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const validateTime = (value: string): string | null => {
    if (!TIME_REGEX.test(value.trim())) {
      return 'Please select a valid reminder time.'
    }

    return null
  }

  const validateDays = (selectedDays: number[]): string | null => {
    if (selectedDays.length === 0) {
      return 'Please select at least one weekday.'
    }

    return null
  }

  const notifyReminderUpdate = () => {
    window.dispatchEvent(new Event(UPDATED_EVENT))
  }

  const persistReminders = async (
    nextReminders: ReminderSettingsData[]
  ): Promise<boolean> => {
    setSaving(true)
    setStorageError(null)

    try {
      const success = await setReminderSettings(nextReminders)

      if (!success) {
        setStorageError(
          'Unable to save reminders. Please check your browser storage.'
        )
        return false
      }

      setReminders(nextReminders)

      const hasEnabledReminder = nextReminders.some(
        (reminder) => reminder.enabled
      )

      if (hasEnabledReminder && permission === 'granted') {
        const registered = await registerDailyPeriodicSync()

        setPeriodicSyncStatus(
          registered ? 'active' : 'unsupported_or_failed'
        )
      } else if (!hasEnabledReminder) {
        await unregisterDailyPeriodicSync()
        setPeriodicSyncStatus(null)
      }

      notifyReminderUpdate()

      return true
    } catch (error) {
      console.warn('[ReminderSettings] Save failed:', error)

      setStorageError('Something went wrong while saving reminders.')

      return false
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (
    selectedDays: number[],
    day: number
  ): number[] => {
    return selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day].sort(
          (a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)
        )
  }

  const createReminder = async () => {
    const nextTimeError = validateTime(time)
    const nextDaysError = validateDays(days)

    setTimeError(nextTimeError)
    setDaysError(nextDaysError)

    if (nextTimeError || nextDaysError || !city) {
      return
    }

    const id =
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `reminder-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const newReminder: ReminderSettingsData = {
      id,
      enabled: true,
      time,
      days: [...days],
      cityId: city.id,
      cityName: city.name,
      lat: city.latitude,
      lon: city.longitude,
      unit: 'c',
    }

    const success = await persistReminders([
      ...reminders,
      newReminder,
    ])

    if (success) {
      setTime(DEFAULT_REMINDER_TIME)
      setDays([])
      setTimeError(null)
      setDaysError(null)
    }
  }

  const handleAddReminder = async () => {
    if (permission === 'unsupported' || permission === 'denied') {
      return
    }

    const nextTimeError = validateTime(time)
    const nextDaysError = validateDays(days)

    setTimeError(nextTimeError)
    setDaysError(nextDaysError)

    if (nextTimeError || nextDaysError || !city) {
      return
    }

    if (permission === 'default') {
      setIsExplaining(true)
      return
    }

    if (permission === 'granted') {
      await createReminder()
    }
  }

  const handleExplanationContinue = async () => {
    setIsExplaining(false)

    const result = await requestPermission()

    setPermission(result)

    if (result === 'granted') {
      await createReminder()
    }
  }

  const handleExplanationDismiss = () => {
    setIsExplaining(false)
  }

  const toggleReminder = async (
    reminderId: string
  ) => {
    const target = reminders.find(
      (reminder) => reminder.id === reminderId
    )

    if (!target) return

    if (
      !target.enabled &&
      permission !== 'granted'
    ) {
      return
    }

    const updated = reminders.map((reminder) =>
      reminder.id === reminderId
        ? { ...reminder, enabled: !reminder.enabled }
        : reminder
    )

    await persistReminders(updated)
  }

  const deleteReminder = async (
    reminderId: string
  ) => {
    const updated = reminders.filter(
      (reminder) => reminder.id !== reminderId
    )

    if (editingId === reminderId) {
      setEditingId(null)
    }

    await persistReminders(updated)
  }

  const startEditing = (
    reminder: ReminderSettingsData
  ) => {
    setEditingId(reminder.id)
    setEditingTime(reminder.time)
    setEditingDays([...reminder.days])
    setEditingError(null)
  }

  const saveEditing = async () => {
    if (!editingId) return

    const timeValidation = validateTime(editingTime)
    const dayValidation = validateDays(editingDays)

    setEditingError(
      timeValidation || dayValidation
    )

    if (timeValidation || dayValidation) return

    const updated = reminders.map((reminder) =>
      reminder.id === editingId
        ? {
            ...reminder,
            time: editingTime,
            days: [...editingDays],
          }
        : reminder
    )

    const success = await persistReminders(updated)

    if (success) {
      setEditingId(null)
      setEditingError(null)
    }
  }

  const handleSendTestNotification = async () => {
    if (!city || permission !== 'granted') return

    let title = `${city.name} Weather`
    let body = 'Weather notifications are active.'

    if (currentReport) {
      const temp = Math.round(currentReport.current.tempC)

      const description = currentReport.current.description

      const todayForecast = currentReport.daily[0]

      const high = todayForecast
        ? `${Math.round(todayForecast.maxC)}°`
        : `${temp}°`

      const low = todayForecast
        ? `${Math.round(todayForecast.minC)}°`
        : `${temp}°`

      title = `${city.name}: ${temp}°C, ${description}`

      body = `High ${high}, low ${low}. Wind: ${Math.round(
        currentReport.current.windSpeedMs * 3.6
      )} km/h.`
    }

    const success = await showWeatherNotification(
      title,
      body,
      {
        tag: `weatherboard-test-${Date.now()}`,
      }
    )

    if (success) {
      setTestSent(true)

      setTimeout(() => {
        setTestSent(false)
      }, 3000)
    }
  }

  const formatDays = (selectedDays: number[]) => {
    if (selectedDays.length === 7) {
      return 'Every day'
    }

    return WEEKDAYS
      .filter((day) => selectedDays.includes(day.value))
      .map((day) => day.short)
      .join(', ')
  }

  const renderDaySelector = (
    selectedDays: number[],
    onChange: (day: number) => void
  ) => (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => {
        const active = selectedDays.includes(day.value)

        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(day.value)}
            className={`min-h-[42px] min-w-[48px] rounded-lg border px-3 text-xs font-semibold transition ${
              active
                ? 'border-[#c5a779] bg-[#9d8055]/20 text-amber-200'
                : 'border-white/10 bg-[#202020] text-[#999] hover:border-white/20 hover:text-white'
            }`}
          >
            {day.short}
          </button>
        )
      })}
    </div>
  )

  const isToggleDisabled =
    permission === 'unsupported' ||
    permission === 'denied' ||
    !city

  return (
    <section
      aria-label="Weather Reminder Settings"
      className="rounded-2xl border border-white/[0.09] bg-[#111] p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
            <BellRing className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">
              Weather Reminders
            </h2>

            <p className="mt-0.5 text-[11px] text-[#777]">
              Multiple times and selected weekdays
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-[#202020] px-2.5 py-1 text-[10px] font-semibold text-[#aaa]">
          {reminders.length} saved
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <p className="py-5 text-center text-xs text-[#888]">
          Loading your reminders...
        </p>
      )}

      {/* Unsupported browser */}
      {permission === 'unsupported' && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Your browser doesn't support notifications.
            Try Chrome or Edge on desktop or Android.
          </p>
        </div>
      )}

      {/* Permission denied */}
      {permission === 'denied' && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs leading-5 text-rose-300"
        >
          <BellOff className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Notifications are blocked. Enable them in your
            browser's site settings, then come back.
          </p>
        </div>
      )}

      {/* Existing reminders */}
      {!loading && reminders.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#888]">
              Your saved reminders
            </h3>
          </div>

          {reminders.map((reminder) => {
            const editing = editingId === reminder.id

            return (
              <div
                key={reminder.id}
                className="rounded-xl border border-white/[0.08] bg-[#191919] p-3"
              >
                {!editing ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-[#aaa]" />

                          <span className="text-sm font-semibold text-white">
                            {reminder.time}
                          </span>

                          <span className="rounded-md bg-[#252525] px-2 py-0.5 text-[10px] text-[#aaa]">
                            {reminder.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        <p className="mt-2 truncate text-xs font-medium text-[#ddd]">
                          {reminder.cityName}
                        </p>

                        <p className="mt-1 text-[11px] text-[#888]">
                          {formatDays(reminder.days) || 'No weekdays selected'}
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={reminder.enabled}
                        aria-label={`Toggle ${reminder.cityName} reminder at ${reminder.time}`}
                        disabled={
                          !reminder.enabled &&
                          permission !== 'granted'
                        }
                        onClick={() => void toggleReminder(reminder.id)}
                        className="relative flex h-11 w-12 shrink-0 items-center justify-center disabled:opacity-40"
                      >
                        <span
                          className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
                            reminder.enabled
                              ? 'border-[#c5a779] bg-[#9d8055]'
                              : 'border-white/10 bg-[#292929]'
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              reminder.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/[0.07] pt-3">
                      <button
                        type="button"
                        onClick={() => startEditing(reminder)}
                        aria-label={`Edit ${reminder.cityName} reminder`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[11px] text-[#bbb] transition hover:bg-white/[0.06]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteReminder(reminder.id)}
                        aria-label={`Delete ${reminder.cityName} reminder`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-500/20 px-3 text-[11px] text-rose-300 transition hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Edit {reminder.cityName}
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel editing"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#888] hover:bg-white/[0.06]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#888]">
                        Reminder time
                      </label>

                      <input
                        type="time"
                        value={editingTime}
                        onChange={(e) => setEditingTime(e.target.value)}
                        className="min-h-[44px] w-full rounded-lg border border-white/10 bg-[#222] px-3 text-sm text-white outline-none focus:border-white/30"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#888]">
                        Select weekdays
                      </label>

                      {renderDaySelector(
                        editingDays,
                        (day) => {
                          setEditingDays((previous) =>
                            toggleDay(previous, day)
                          )
                        }
                      )}
                    </div>

                    {editingError && (
                      <p role="alert" className="text-xs text-rose-400">
                        {editingError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void saveEditing()}
                      disabled={saving}
                      className="min-h-[44px] w-full rounded-lg bg-[#c0a174] px-4 text-xs font-semibold text-[#17120b] transition hover:bg-[#d0b58c] disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && reminders.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-[#171717] px-4 py-5 text-center">
          <Bell className="mx-auto h-6 w-6 text-[#777]" />

          <p className="mt-2 text-xs font-medium text-white">
            No reminders created yet
          </p>

          <p className="mt-1 text-[11px] text-[#888]">
            Create your first reminder below.
          </p>
        </div>
      )}

      {/* Add reminder */}
      <div className="mt-5 border-t border-white/[0.08] pt-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
          <Plus className="h-4 w-4 text-amber-300" />
          Add a new reminder
        </h3>

        <p className="mt-1 text-[11px] text-[#888]">
          This reminder will be saved separately from your existing ones.
        </p>

        <div className="mt-4 space-y-4">
          {/* Selected city */}
          <div className="rounded-lg border border-white/[0.08] bg-[#191919] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Reminder city
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {city ? city.name : 'Select a city first'}
            </p>
          </div>

          {/* Time */}
          <div>
            <label
              htmlFor={timeInputId}
              className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#888]"
            >
              Reminder time
            </label>

            <div className="relative">
              <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />

              <input
                id={timeInputId}
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value)
                  setTimeError(null)
                }}
                onBlur={() => setTimeError(validateTime(time))}
                aria-invalid={Boolean(timeError)}
                aria-describedby={timeError ? errorId : undefined}
                className="min-h-[46px] w-full rounded-lg border border-white/[0.09] bg-[#191919] py-2 pl-10 pr-3 text-sm text-white outline-none transition focus:border-white/25 focus:ring-2 focus:ring-white/10"
              />
            </div>

            {timeError && (
              <p
                id={errorId}
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs text-rose-400"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {timeError}
              </p>
            )}
          </div>

          {/* Weekdays */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
                Repeat on
              </label>

              <span className="text-[10px] text-[#777]">
                Select your days
              </span>
            </div>

            {renderDaySelector(days, (day) => {
              setDays((previous) => toggleDay(previous, day))
              setDaysError(null)
            })}

            {daysError && (
              <p role="alert" className="mt-2 text-xs text-rose-400">
                {daysError}
              </p>
            )}

            <p className="mt-2 text-[10px] text-[#777]">
              Only selected weekdays will trigger this reminder.
            </p>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={() => void handleAddReminder()}
            disabled={isToggleDisabled || saving || loading}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#c0a174] px-4 py-3 text-xs font-semibold text-[#17120b] transition hover:bg-[#d0b58c] focus:outline-none focus:ring-2 focus:ring-amber-300/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving...' : 'Create reminder'}
          </button>
        </div>
      </div>

      {/* Permission explanation */}
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
              <h3
                id="notification-explainer-title"
                className="text-sm font-semibold text-amber-100"
              >
                Allow Weather Notifications
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#c1b9aa]">
                WeatherBoard will send notifications for{' '}
                <strong className="text-white">
                  {activeCityName}
                </strong>{' '}
                at your selected time and weekdays. Your browser
                will now ask for notification permission.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleExplanationContinue()}
                  className="min-h-[44px] rounded-lg bg-[#c0a174] px-4 py-2 text-xs font-semibold text-[#17120b] transition hover:bg-[#d0b58c]"
                >
                  Continue
                </button>

                <button
                  type="button"
                  onClick={handleExplanationDismiss}
                  className="min-h-[44px] rounded-lg border border-white/10 bg-[#252525] px-4 py-2 text-xs font-medium text-[#ccc] transition hover:bg-[#303030]"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test notification */}
      {permission === 'granted' && (
        <button
          type="button"
          onClick={() => void handleSendTestNotification()}
          disabled={!city}
          aria-label="Send test weather notification now"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#222] px-4 py-2.5 text-xs font-semibold text-[#ddd] transition hover:border-white/20 hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {testSent ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300">
                Test notification sent!
              </span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 text-[#999]" />
              Send test notification
            </>
          )}
        </button>
      )}

      {/* Background sync status */}
      {reminders.some((reminder) => reminder.enabled) &&
        periodicSyncStatus === 'active' && (
          <p className="mt-4 flex items-center gap-2 text-[11px] text-emerald-400">
            <Radio className="h-3.5 w-3.5" />
            Background reminders are active
          </p>
        )}

      {reminders.some((reminder) => reminder.enabled) &&
        periodicSyncStatus === 'unsupported_or_failed' && (
          <p className="mt-4 text-[11px] leading-5 text-[#888]">
            Your browser can't run background reminders.
            Keep WeatherBoard open (or installed) at your reminder
            times to receive notifications.
          </p>
        )}

      {storageError && (
        <p role="alert" className="mt-3 text-xs text-rose-400">
          {storageError}
        </p>
      )}
    </section>
  )
}
