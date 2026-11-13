/**
 * OpenWeatherMap Service
 *
 * Calls /weather (current) and /forecast (5-day / 3-hour forecast).
 * Computes daily min/max and selects the noon entry for representative daily condition
 * using the city's local timezone offset (from the forecast response).
 */

import { env } from '../lib/env'
import { City, CurrentWeather, DailyForecast, WeatherCondition, WeatherError, WeatherReport } from '../types'

interface OwmWeatherItem {
  id: number
  main: string
  description: string
  icon: string
}

interface OwmCurrentResponse {
  dt: number
  timezone: number // shift in seconds from UTC
  main: {
    temp: number
    feels_like?: number
    temp_min: number
    temp_max: number
    humidity: number
  }
  wind?: {
    speed?: number
    gust?: number
  }
  weather?: OwmWeatherItem[]
}

interface OwmForecastEntry {
  dt: number
  main: {
    temp: number
    feels_like?: number
    temp_min: number
    temp_max: number
    humidity: number
  }
  weather?: OwmWeatherItem[]
  wind?: {
    speed?: number
    gust?: number
  }
}

interface OwmForecastResponse {
  city?: {
    timezone?: number // shift in seconds from UTC
  }
  list: OwmForecastEntry[]
}

function capitalize(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function mapOwmConditionId(id: number): { condition: WeatherCondition; descriptionFallback: string } {
  if (id >= 200 && id < 300) {
    return { condition: 'thunderstorm', descriptionFallback: 'Thunderstorm' }
  }
  if (id >= 300 && id < 400) {
    return { condition: 'drizzle', descriptionFallback: 'Drizzle' }
  }
  if (id >= 500 && id < 600) {
    return { condition: 'rain', descriptionFallback: 'Rain' }
  }
  if (id >= 600 && id < 700) {
    return { condition: 'snow', descriptionFallback: 'Snow' }
  }
  if (id >= 700 && id < 800) {
    return { condition: 'fog', descriptionFallback: 'Mist or fog' }
  }
  if (id === 800) {
    return { condition: 'clear', descriptionFallback: 'Clear sky' }
  }
  if (id === 801 || id === 802) {
    return { condition: 'partly-cloudy', descriptionFallback: 'Partly cloudy' }
  }
  if (id >= 803 && id <= 804) {
    return { condition: 'cloudy', descriptionFallback: 'Overcast clouds' }
  }
  return { condition: 'partly-cloudy', descriptionFallback: 'Partly cloudy' }
}

/**
 * Returns true when an error is an abort/timeout that originated from our internal
 * timeout signal (NOT from the caller's signal), i.e. a signal the user did NOT trigger.
 * Both AbortError (manual abort) and TimeoutError (AbortSignal.timeout) must be caught.
 */
function isAbortOrTimeoutError(error: unknown): boolean {
  const name = (error as { name?: string })?.name
  return name === 'AbortError' || name === 'TimeoutError'
}

async function fetchOwmEndpoint<T>(endpoint: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = new URL(`https://api.openweathermap.org/data/2.5/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  url.searchParams.set('units', 'metric')
  url.searchParams.set('appid', env.OWM_API_KEY)

  let response: Response

  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      signal,
    })
  } catch (error: unknown) {
    // Rethrow abort/timeout errors so the caller can handle them
    if (signal?.aborted || isAbortOrTimeoutError(error)) {
      throw error
    }
    throw new WeatherError('network', 'openweathermap', 'Network error. You appear to be offline.')
  }

  if (!response.ok) {
    const status = response.status
    if (status === 401 || status === 403) {
      throw new WeatherError('auth', 'openweathermap', 'OpenWeatherMap API key invalid or not yet activated.', status)
    }
    if (status === 429) {
      throw new WeatherError('rate_limit', 'openweathermap', 'OpenWeatherMap rate limit exceeded.', status)
    }
    if (status === 404) {
      throw new WeatherError('not_found', 'openweathermap', 'Location not found in OpenWeatherMap.', status)
    }
    if (status >= 500 && status < 600) {
      throw new WeatherError('server', 'openweathermap', `OpenWeatherMap server error (HTTP ${status}).`, status)
    }
    throw new WeatherError('server', 'openweathermap', `Unexpected OpenWeatherMap response (HTTP ${status}).`, status)
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new WeatherError('server', 'openweathermap', 'Failed to parse OpenWeatherMap response JSON.')
  }
}

/**
 * Combines an optional caller-supplied AbortSignal with a timeout signal.
 * Uses AbortSignal.any when available (Chrome 116+, Firefox 124+), otherwise
 * falls back to a manual listener-based implementation.
 */
function withTimeout(callerSignal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  if (callerSignal?.aborted) {
    return callerSignal
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs)

  if (!callerSignal) return timeoutSignal

  // Use AbortSignal.any if available
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([callerSignal, timeoutSignal])
  }

  // Manual fallback
  const controller = new AbortController()
  const abort = (reason: unknown) => controller.abort(reason)

  if (timeoutSignal.aborted) {
    abort(timeoutSignal.reason)
    return controller.signal
  }

  callerSignal.addEventListener('abort', () => abort(callerSignal.reason), { once: true })
  timeoutSignal.addEventListener('abort', () => abort(timeoutSignal.reason), { once: true })

  return controller.signal
}

/**
 * Groups OWM 3-hourly forecast entries into daily buckets using the city's local
 * timezone offset. Returns exactly up to 5 days of forecast.
 *
 * Rules:
 * - Each entry is assigned to its local calendar date using the timezone offset.
 * - "Today" is derived from currentDt + timezoneOffsetSeconds.
 * - We keep the first 5 local dates that are >= todayKey.
 * - If fewer than 5 future dates exist in the data, we pad from the earliest dates
 *   available to always return at minimum what the data has (never crash).
 * - The "representative" condition for each day is the entry closest to local noon.
 * - Today's current observed temperature is included in the today min/max.
 */
export function groupForecastByLocalDay(
  list: OwmForecastEntry[],
  currentDt: number,
  currentTemp: number,
  timezoneOffsetSeconds: number
): DailyForecast[] {
  interface DayGroup {
    minC: number
    maxC: number
    noonEntry: OwmForecastEntry
    minDistToNoon: number
  }

  const grouped = new Map<string, DayGroup>()

  for (const entry of list) {
    // Shift entry.dt by the city's timezone offset to get local date and hour
    const localTimeMs = (entry.dt + timezoneOffsetSeconds) * 1000
    const localDate = new Date(localTimeMs)
    const year = localDate.getUTCFullYear()
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(localDate.getUTCDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    const localHour = localDate.getUTCHours() + localDate.getUTCMinutes() / 60
    const distToNoon = Math.abs(localHour - 12)

    const existing = grouped.get(dateKey)
    if (!existing) {
      grouped.set(dateKey, {
        minC: entry.main?.temp_min ?? entry.main?.temp ?? 0,
        maxC: entry.main?.temp_max ?? entry.main?.temp ?? 0,
        noonEntry: entry,
        minDistToNoon: distToNoon,
      })
    } else {
      existing.minC = Math.min(existing.minC, entry.main?.temp_min ?? entry.main?.temp ?? existing.minC)
      existing.maxC = Math.max(existing.maxC, entry.main?.temp_max ?? entry.main?.temp ?? existing.maxC)
      if (distToNoon < existing.minDistToNoon) {
        existing.noonEntry = entry
        existing.minDistToNoon = distToNoon
      }
    }
  }

  // Determine todayKey from the current observation's local time
  const todayLocal = new Date((currentDt + timezoneOffsetSeconds) * 1000)
  const todayKey = `${todayLocal.getUTCFullYear()}-${String(todayLocal.getUTCMonth() + 1).padStart(2, '0')}-${String(
    todayLocal.getUTCDate()
  ).padStart(2, '0')}`

  // Include the current observed temp in today's min/max
  const todayGroup = grouped.get(todayKey)
  if (todayGroup) {
    todayGroup.minC = Math.min(todayGroup.minC, currentTemp)
    todayGroup.maxC = Math.max(todayGroup.maxC, currentTemp)
  }

  // Take the first 5 local dates >= todayKey; if fewer than 5, pad from earliest dates
  const sortedDates = Array.from(grouped.keys()).sort()
  const futureDates = sortedDates.filter((d) => d >= todayKey)
  const finalDates = futureDates.length >= 5
    ? futureDates.slice(0, 5)
    : sortedDates.slice(0, Math.min(5, sortedDates.length))

  return finalDates.map((dateKey) => {
    const group = grouped.get(dateKey)!
    const repWeather = group.noonEntry.weather?.[0]
    const repMeta = mapOwmConditionId(repWeather?.id ?? 800)

    return {
      date: dateKey,
      minC: Math.round(group.minC * 10) / 10,
      maxC: Math.round(group.maxC * 10) / 10,
      condition: repMeta.condition,
      description: repWeather?.description ? capitalize(repWeather.description) : repMeta.descriptionFallback,
    }
  })
}

export async function fetchOwmWeather(city: City, signal?: AbortSignal): Promise<WeatherReport> {
  const lat = String(city.latitude)
  const lon = String(city.longitude)

  // Apply a 6-second client-side timeout so a slow OWM response triggers the
  // Open-Meteo fallback instead of hanging indefinitely.
  // The combined signal aborts when EITHER the caller cancels OR the timeout fires.
  const combinedSignal = withTimeout(signal, 6000)

  let currentData: OwmCurrentResponse
  let forecastData: OwmForecastResponse

  try {
    ;[currentData, forecastData] = await Promise.all([
      fetchOwmEndpoint<OwmCurrentResponse>('weather', { lat, lon }, combinedSignal),
      fetchOwmEndpoint<OwmForecastResponse>('forecast', { lat, lon }, combinedSignal),
    ])
  } catch (error: unknown) {
    // Caller aborted (user changed city) — rethrow silently
    if (signal?.aborted) throw error

    // Internal timeout (TimeoutError from AbortSignal.timeout, or AbortError from manual abort)
    if (isAbortOrTimeoutError(error)) {
      throw new WeatherError('timeout', 'openweathermap', 'OpenWeatherMap took too long to respond.')
    }

    // Already a typed WeatherError — rethrow as-is
    if (error instanceof WeatherError) throw error

    // Unexpected error during fetch
    throw new WeatherError('server', 'openweathermap', 'Unexpected error contacting OpenWeatherMap.')
  }

  // Map the responses. Wrap in try/catch so a malformed response throws a typed error
  // (which weatherService can then fall back on) rather than surfacing as 'unknown'.
  try {
    const timezoneOffsetSeconds = forecastData.city?.timezone ?? currentData.timezone ?? 0

    // 1. Current Weather
    const weatherItem = currentData.weather?.[0]
    const conditionMeta = mapOwmConditionId(weatherItem?.id ?? 800)
    const isNight = Boolean(weatherItem?.icon?.endsWith('n'))

    const current: CurrentWeather = {
      tempC: currentData.main.temp,
      feelsLikeC: currentData.main.feels_like,
      humidity: currentData.main.humidity,
      windSpeedMs: currentData.wind?.speed ?? 0,
      condition: conditionMeta.condition,
      description: weatherItem?.description ? capitalize(weatherItem.description) : conditionMeta.descriptionFallback,
      isNight,
      observedAt: new Date(currentData.dt * 1000).toISOString(),
    }

    // 2. Daily Forecast
    const daily = groupForecastByLocalDay(
      forecastData.list ?? [],
      currentData.dt,
      currentData.main.temp,
      timezoneOffsetSeconds
    )

    return {
      city,
      current,
      daily,
      timezoneOffsetSeconds,
      source: 'openweathermap',
      fetchedAt: new Date().toISOString(),
    }
  } catch (error: unknown) {
    // Mapping error — treat as server error so weatherService can fall back
    if (error instanceof WeatherError) throw error
    console.error('[OWM] Response mapping failed:', error)
    throw new WeatherError('server', 'openweathermap', 'Failed to process OpenWeatherMap response.')
  }
}
