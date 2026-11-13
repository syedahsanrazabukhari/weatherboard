/**
 * Safe LocalStorage Helper
 *
 * Provides a resilient wrapper around localStorage.
 * Handles SecurityError (e.g. storage blocked in private mode / iframe),
 * QuotaExceededError, corrupt JSON, and validates city & weather schemas.
 */

import { City, WeatherReport } from '../types'

export const FAVORITES_STORAGE_KEY = 'weatherboard:favorites:v1'
export const LAST_REPORT_STORAGE_KEY = 'weatherboard:lastReport:v1'
export const LAST_CITY_STORAGE_KEY = 'weatherboard:lastCity:v1'
export const MAX_FAVORITES = 5

let storageAvailableCache: boolean | null = null
let inMemoryFavoritesFallback: City[] = []
let inMemoryReportFallback: WeatherReport | null = null
let inMemoryCityFallback: City | null = null

/**
 * Validates whether localStorage is accessible and functional.
 * Handles environments where accessing `window.localStorage` throws SecurityError.
 */
export function isLocalStorageAvailable(): boolean {
  if (storageAvailableCache !== null) {
    return storageAvailableCache
  }

  if (typeof window === 'undefined') {
    storageAvailableCache = false
    return false
  }

  try {
    const testKey = '__wb_storage_test__'
    window.localStorage.setItem(testKey, testKey)
    const retrieved = window.localStorage.getItem(testKey)
    window.localStorage.removeItem(testKey)
    storageAvailableCache = retrieved === testKey
  } catch {
    storageAvailableCache = false
  }

  return storageAvailableCache
}

/**
 * Validates that an arbitrary parsed object satisfies the City interface.
 */
export function isValidCity(item: unknown): item is City {
  if (!item || typeof item !== 'object') {
    return false
  }

  const c = item as Record<string, unknown>

  return (
    typeof c.id === 'number' &&
    !Number.isNaN(c.id) &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    typeof c.country === 'string' &&
    typeof c.latitude === 'number' &&
    !Number.isNaN(c.latitude) &&
    typeof c.longitude === 'number' &&
    !Number.isNaN(c.longitude)
  )
}

/**
 * Validates that an arbitrary parsed object satisfies the WeatherReport interface.
 */
export function isValidWeatherReport(item: unknown): item is WeatherReport {
  if (!item || typeof item !== 'object') {
    return false
  }

  const r = item as Record<string, unknown>

  return (
    isValidCity(r.city) &&
    typeof r.current === 'object' &&
    r.current !== null &&
    typeof (r.current as Record<string, unknown>).tempC === 'number' &&
    Array.isArray(r.daily) &&
    r.daily.length === 5 &&
    typeof r.timezoneOffsetSeconds === 'number' &&
    (r.source === 'openweathermap' || r.source === 'open-meteo') &&
    typeof r.fetchedAt === 'string'
  )
}

/**
 * Reads and sanitizes favourites from storage or in-memory fallback.
 * Guarantees no duplicates, valid schemas, and a max count of 5.
 */
export function readFavorites(): City[] {
  if (!isLocalStorageAvailable()) {
    return inMemoryFavoritesFallback.slice(0, MAX_FAVORITES)
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    const validCities: City[] = []
    const seenIds = new Set<number>()

    for (const item of parsed) {
      if (isValidCity(item) && !seenIds.has(item.id)) {
        seenIds.add(item.id)
        validCities.push({
          id: item.id,
          name: String(item.name).trim(),
          region: typeof item.region === 'string' ? item.region.trim() : '',
          country: String(item.country).trim(),
          countryCode: typeof item.countryCode === 'string' ? item.countryCode.trim().toUpperCase() : '',
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
        })

        if (validCities.length >= MAX_FAVORITES) {
          break
        }
      }
    }

    inMemoryFavoritesFallback = validCities
    return validCities
  } catch {
    return inMemoryFavoritesFallback.slice(0, MAX_FAVORITES)
  }
}

/**
 * Writes favourites to storage, falling back to memory if storage is blocked or quota exceeded.
 */
export function writeFavorites(favorites: City[]): boolean {
  const capped = favorites.slice(0, MAX_FAVORITES)
  inMemoryFavoritesFallback = capped

  if (!isLocalStorageAvailable()) {
    return false
  }

  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(capped))
    return true
  } catch {
    return false
  }
}

/**
 * Reads the last successfully loaded WeatherReport from storage or memory.
 */
export function readLastWeatherReport(): WeatherReport | null {
  if (!isLocalStorageAvailable()) {
    return inMemoryReportFallback
  }

  try {
    const raw = window.localStorage.getItem(LAST_REPORT_STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (isValidWeatherReport(parsed)) {
      inMemoryReportFallback = parsed
      return parsed
    }
    return null
  } catch {
    return inMemoryReportFallback
  }
}

/**
 * Persists the last successfully loaded WeatherReport.
 */
export function writeLastWeatherReport(report: WeatherReport): boolean {
  inMemoryReportFallback = report

  if (!isLocalStorageAvailable()) {
    return false
  }

  try {
    window.localStorage.setItem(LAST_REPORT_STORAGE_KEY, JSON.stringify(report))
    return true
  } catch {
    return false
  }
}

/**
 * Reads the last selected city from storage or memory.
 */
export function readLastCity(): City | null {
  if (!isLocalStorageAvailable()) {
    return inMemoryCityFallback
  }

  try {
    const raw = window.localStorage.getItem(LAST_CITY_STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (isValidCity(parsed)) {
      inMemoryCityFallback = parsed
      return parsed
    }
    return null
  } catch {
    return inMemoryCityFallback
  }
}

/**
 * Persists the last selected city.
 */
export function writeLastCity(city: City): boolean {
  inMemoryCityFallback = city

  if (!isLocalStorageAvailable()) {
    return false
  }

  try {
    window.localStorage.setItem(LAST_CITY_STORAGE_KEY, JSON.stringify(city))
    return true
  } catch {
    return false
  }
}
