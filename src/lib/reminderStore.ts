
/**
 * WeatherBoard Reminder Storage
 *
 * Stores multiple independent reminders in IndexedDB.
 * Shared by the application and the service worker.
 */

import { createStore, del, get, set } from 'idb-keyval'

export interface ReminderSettings {
  id: string
  enabled: boolean
  time: string
  days: number[] // JavaScript weekdays: Sunday=0 ... Saturday=6
  cityId: number
  cityName: string
  lat: number
  lon: number
  unit?: 'c' | 'f'
}

interface LegacyReminderSettings {
  enabled: boolean
  time: string
  cityId: number
  cityName: string
  lat: number
  lon: number
  unit?: 'c' | 'f'
}

export const REMINDER_SETTINGS_KEY = 'weatherboard_reminders_v2'
export const LEGACY_REMINDER_SETTINGS_KEY = 'weatherboard_reminder_settings_v1'

export const LAST_NOTIFIED_DATES_KEY = 'weatherboard_last_notified_dates_v2'
export const LAST_NOTIFIED_DATE_KEY = 'weatherboard_last_notified_date_v1'

export const DEFAULT_REMINDER_TIME = '08:00'

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

const reminderStore = isIndexedDBAvailable()
  ? createStore('weatherboard-db', 'reminders')
  : undefined

let inMemoryFallback: ReminderSettings[] | null = null
let inMemoryLastNotifiedFallback: Record<string, string> = {}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  )
}

function isValidReminder(item: unknown): item is ReminderSettings {
  if (!item || typeof item !== 'object') {
    return false
  }

  const s = item as Record<string, unknown>

  return (
    typeof s.id === 'string' &&
    s.id.length > 0 &&
    typeof s.enabled === 'boolean' &&
    isValidTime(s.time) &&
    Array.isArray(s.days) &&
    s.days.length <= 7 &&
    s.days.every(
      (day) =>
        typeof day === 'number' &&
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6
    ) &&
    new Set(s.days).size === s.days.length &&
    typeof s.cityId === 'number' &&
    Number.isFinite(s.cityId) &&
    typeof s.cityName === 'string' &&
    typeof s.lat === 'number' &&
    Number.isFinite(s.lat) &&
    typeof s.lon === 'number' &&
    Number.isFinite(s.lon) &&
    (s.unit === undefined || s.unit === 'c' || s.unit === 'f')
  )
}

function isValidLegacyReminder(
  item: unknown
): item is LegacyReminderSettings {
  if (!item || typeof item !== 'object') {
    return false
  }

  const s = item as Record<string, unknown>

  return (
    typeof s.enabled === 'boolean' &&
    isValidTime(s.time) &&
    typeof s.cityId === 'number' &&
    Number.isFinite(s.cityId) &&
    typeof s.cityName === 'string' &&
    typeof s.lat === 'number' &&
    Number.isFinite(s.lat) &&
    typeof s.lon === 'number' &&
    Number.isFinite(s.lon) &&
    (s.unit === undefined || s.unit === 'c' || s.unit === 'f')
  )
}

/**
 * Converts the previous single-reminder format into the new array format.
 * Existing daily reminders retain their original daily schedule.
 */
async function migrateLegacyReminder(): Promise<ReminderSettings[]> {
  if (!reminderStore) {
    return []
  }

  try {
    const legacy = await get<unknown>(
      LEGACY_REMINDER_SETTINGS_KEY,
      reminderStore
    )

    if (!isValidLegacyReminder(legacy)) {
      return []
    }

    const migrated: ReminderSettings = {
      id: `legacy-${legacy.cityId}`,
      enabled: legacy.enabled,
      time: legacy.time,
      days: [0, 1, 2, 3, 4, 5, 6],
      cityId: legacy.cityId,
      cityName: legacy.cityName,
      lat: legacy.lat,
      lon: legacy.lon,
      unit: legacy.unit === 'f' ? 'f' : 'c',
    }

    await set(REMINDER_SETTINGS_KEY, [migrated], reminderStore)

    return [migrated]
  } catch (error) {
    console.warn('[ReminderStore] Legacy migration failed:', error)
    return []
  }
}

/**
 * Retrieves every saved reminder.
 */
export async function getReminderSettings(): Promise<ReminderSettings[]> {
  if (!isIndexedDBAvailable() || !reminderStore) {
    return inMemoryFallback ?? []
  }

  try {
    const stored = await get<unknown>(
      REMINDER_SETTINGS_KEY,
      reminderStore
    )

    if (Array.isArray(stored)) {
      const valid = stored.filter(isValidReminder)

      inMemoryFallback = valid
      return valid
    }

    const migrated = await migrateLegacyReminder()

    inMemoryFallback = migrated

    return migrated
  } catch (error) {
    console.warn('[ReminderStore] Failed to read reminders:', error)
    return inMemoryFallback ?? []
  }
}

/**
 * Saves the complete reminder list.
 */
export async function setReminderSettings(
  reminders: ReminderSettings[]
): Promise<boolean> {
  if (!reminders.every(isValidReminder)) {
    console.warn('[ReminderStore] Invalid reminder data.')
    return false
  }

  inMemoryFallback = reminders

  if (!isIndexedDBAvailable() || !reminderStore) {
    return true
  }

  try {
    await set(REMINDER_SETTINGS_KEY, reminders, reminderStore)
    return true
  } catch (error) {
    console.warn('[ReminderStore] Failed to save reminders:', error)
    return false
  }
}

/**
 * Deletes every reminder.
 */
export async function clearReminderSettings(): Promise<boolean> {
  inMemoryFallback = []

  if (!isIndexedDBAvailable() || !reminderStore) {
    return true
  }

  try {
    await del(REMINDER_SETTINGS_KEY, reminderStore)
    return true
  } catch (error) {
    console.warn('[ReminderStore] Failed to clear reminders:', error)
    return false
  }
}

/**
 * Retrieves the last notification date for one specific reminder.
 */
export async function getReminderLastNotifiedDate(
  reminderId: string
): Promise<string | null> {
  if (!isIndexedDBAvailable() || !reminderStore) {
    return inMemoryLastNotifiedFallback[reminderId] ?? null
  }

  try {
    const dates = await get<Record<string, string>>(
      LAST_NOTIFIED_DATES_KEY,
      reminderStore
    )

    if (dates && typeof dates === 'object') {
      inMemoryLastNotifiedFallback = dates

      return typeof dates[reminderId] === 'string'
        ? dates[reminderId]
        : null
    }

    return null
  } catch (error) {
    console.warn('[ReminderStore] Failed to read notification history:', error)

    return inMemoryLastNotifiedFallback[reminderId] ?? null
  }
}

/**
 * Saves the last notification date for one specific reminder.
 */
export async function setReminderLastNotifiedDate(
  reminderId: string,
  dateString: string
): Promise<boolean> {
  const current = await getReminderLastNotifiedDates()

  const updated = {
    ...current,
    [reminderId]: dateString,
  }

  inMemoryLastNotifiedFallback = updated

  if (!isIndexedDBAvailable() || !reminderStore) {
    return true
  }

  try {
    await set(LAST_NOTIFIED_DATES_KEY, updated, reminderStore)
    return true
  } catch (error) {
    console.warn('[ReminderStore] Failed to save notification history:', error)
    return false
  }
}

async function getReminderLastNotifiedDates(): Promise<Record<string, string>> {
  if (!isIndexedDBAvailable() || !reminderStore) {
    return inMemoryLastNotifiedFallback
  }

  try {
    const dates = await get<Record<string, string>>(
      LAST_NOTIFIED_DATES_KEY,
      reminderStore
    )

    if (dates && typeof dates === 'object') {
      inMemoryLastNotifiedFallback = dates
      return dates
    }

    return inMemoryLastNotifiedFallback
  } catch {
    return inMemoryLastNotifiedFallback
  }
}

/**
 * Updates the notification temperature unit for all reminders.
 */
export async function setReminderUnit(
  unit: 'c' | 'f'
): Promise<void> {
  try {
    const reminders = await getReminderSettings()

    const updated = reminders.map((reminder) => ({
      ...reminder,
      unit,
    }))

    await setReminderSettings(updated)
  } catch (error) {
    console.warn('[ReminderStore] Failed to update reminder units:', error)
  }
}
