/**
 * Daily Weather Reminder Storage Layer
 *
 * Persists reminder settings in IndexedDB using `idb-keyval` so the Service Worker
 * can retrieve it in background tasks without relying on window.localStorage.
 * Exports get/set/clear functions usable from both Window and ServiceWorkerGlobalScope.
 */

import { createStore, del, get, set } from 'idb-keyval'

export interface ReminderSettings {
  enabled: boolean
  time: string // 'HH:mm' 24-hour format (e.g. '08:00')
  cityId: number
  cityName: string
  lat: number
  lon: number
  /** Display unit for notifications ('c' default). Kept in sync by useUnit. */
  unit?: 'c' | 'f'
}

export const REMINDER_SETTINGS_KEY = 'weatherboard_reminder_settings_v1'
export const LAST_NOTIFIED_DATE_KEY = 'weatherboard_last_notified_date_v1'
export const DEFAULT_REMINDER_TIME = '08:00'

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

// Dedicated IndexedDB store for WeatherBoard reminders
const reminderStore = isIndexedDBAvailable()
  ? createStore('weatherboard-db', 'reminders')
  : undefined

// In-memory fallback if IndexedDB is inaccessible (e.g. storage disabled / sandbox restrictions)
let inMemoryFallback: ReminderSettings | null = null
let inMemoryLastNotifiedFallback: string | null = null

/**
 * Validates that an arbitrary object satisfies the ReminderSettings schema.
 */
export function isValidReminderSettings(item: unknown): item is ReminderSettings {
  if (!item || typeof item !== 'object') {
    return false
  }
  const s = item as Record<string, unknown>
  return (
    typeof s.enabled === 'boolean' &&
    typeof s.time === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) &&
    typeof s.cityId === 'number' &&
    typeof s.cityName === 'string' &&
    typeof s.lat === 'number' &&
    typeof s.lon === 'number' &&
    (s.unit === undefined || s.unit === 'c' || s.unit === 'f')
  )
}

/**
 * Retrieves the persisted reminder settings from IndexedDB (or in-memory fallback).
 */
export async function getReminderSettings(): Promise<ReminderSettings | null> {
  if (!isIndexedDBAvailable() || !reminderStore) {
    return inMemoryFallback
  }

  try {
    const val = await get<ReminderSettings>(REMINDER_SETTINGS_KEY, reminderStore)
    if (isValidReminderSettings(val)) {
      inMemoryFallback = val
      return val
    }
    return inMemoryFallback
  } catch (error) {
    console.warn('[ReminderStore] Failed to read from IndexedDB:', error)
    return inMemoryFallback
  }
}

/**
 * Persists reminder settings to IndexedDB.
 */
export async function setReminderSettings(settings: ReminderSettings): Promise<boolean> {
  inMemoryFallback = settings

  if (!isIndexedDBAvailable() || !reminderStore) {
    return true
  }

  try {
    await set(REMINDER_SETTINGS_KEY, settings, reminderStore)
    return true
  } catch (error) {
    console.warn('[ReminderStore] Failed to write to IndexedDB:', error)
    return false
  }
}

/**
 * Clears the persisted reminder settings from IndexedDB.
 */
export async function clearReminderSettings(): Promise<boolean> {
  inMemoryFallback = null

  if (!isIndexedDBAvailable() || !reminderStore) {
    return true
  }

  try {
    await del(REMINDER_SETTINGS_KEY, reminderStore)
    return true
  } catch (error) {
    console.warn('[ReminderStore] Failed to delete from IndexedDB:', error)
    return false
  }
}

/**
 * Retrieves the last notified calendar date ('YYYY-MM-DD').
 */
export async function getLastNotifiedDate(): Promise<string | null> {
  if (!isIndexedDBAvailable() || !reminderStore) {
    return inMemoryLastNotifiedFallback
  }

  try {
    const val = await get<string>(LAST_NOTIFIED_DATE_KEY, reminderStore)
    if (typeof val === 'string') {
      inMemoryLastNotifiedFallback = val
      return val
    }
    return inMemoryLastNotifiedFallback
  } catch (error) {
    console.warn('[ReminderStore] Failed to read lastNotifiedDate:', error)
    return inMemoryLastNotifiedFallback
  }
}

/**
 * Persists the last notified calendar date ('YYYY-MM-DD').
 */
export async function setLastNotifiedDate(dateString: string): Promise<boolean> {
  inMemoryLastNotifiedFallback = dateString

  if (!isIndexedDBAvailable() || !reminderStore) {
    return true
  }

  try {
    await set(LAST_NOTIFIED_DATE_KEY, dateString, reminderStore)
    return true
  } catch (error) {
    console.warn('[ReminderStore] Failed to write lastNotifiedDate:', error)
    return false
  }
}

/**
 * Updates only the unit of the saved reminder (if a reminder exists), so the
 * service worker formats background notifications in the unit the user picked.
 */
export async function setReminderUnit(unit: 'c' | 'f'): Promise<void> {
  try {
    const settings = await getReminderSettings()
    if (settings && settings.unit !== unit) {
      await setReminderSettings({ ...settings, unit })
    }
  } catch (error) {
    console.warn('[ReminderStore] Failed to update reminder unit:', error)
  }
}