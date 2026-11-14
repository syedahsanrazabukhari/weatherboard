/**
 * Shared Weather Reminder Notification Module
 *
 * Safe for use in both Window and ServiceWorkerGlobalScope environments.
 * Does NOT touch `window` or `localStorage`.
 *
 * ARCHITECTURAL LIMITATION NOTE:
 * True Web Push at an exact scheduled minute requires a backend push server
 * (using the Web Push Protocol with VAPID/FCM). In a client-side-only PWA,
 * we utilize the Periodic Background Sync API where supported.
 * Periodic Background Sync is Chromium-only (Chrome/Edge on desktop and Android),
 * requires the PWA to be installed, and browser heuristics decide the actual
 * execution window based on user engagement and battery state.
 * To provide a dependable experience across all browsers, the app also includes
 * foreground timer fallbacks that dispatch the notification when the tab is open.
 */

export interface ReminderWeatherData {
  tempC: number
  description: string
  highC: number
  lowC: number
}

export interface NotificationPayload {
  title: string
  body: string
}

/**
 * Maps WMO weather interpretation codes to human-readable condition descriptions.
 */
function getWmoDescription(code: number): string {
  switch (code) {
    case 0:
      return 'clear sky'
    case 1:
      return 'mainly clear'
    case 2:
      return 'partly cloudy'
    case 3:
      return 'overcast'
    case 45:
    case 48:
      return 'fog'
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return 'drizzle'
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return 'rain'
    case 71:
    case 73:
    case 75:
    case 77:
      return 'snow'
    case 80:
    case 81:
    case 82:
      return 'rain showers'
    case 85:
    case 86:
      return 'snow showers'
    case 95:
    case 96:
    case 99:
      return 'thunderstorm'
    default:
      return 'partly cloudy'
  }
}

/**
 * Fetches current weather and today's high/low directly from Open-Meteo.
 * Open-Meteo requires no API key, works seamlessly across domains, and is fast.
 */
export async function fetchReminderWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<ReminderWeatherData | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', 'temperature_2m,weather_code')
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal,
    })

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number
        weather_code?: number
      }
      daily?: {
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
      }
    }

    const currentTemp = json.current?.temperature_2m
    const weatherCode = json.current?.weather_code ?? 0
    const high = json.daily?.temperature_2m_max?.[0]
    const low = json.daily?.temperature_2m_min?.[0]

    if (typeof currentTemp !== 'number') {
      return null
    }

    return {
      tempC: currentTemp,
      description: getWmoDescription(weatherCode),
      highC: typeof high === 'number' ? high : currentTemp,
      lowC: typeof low === 'number' ? low : currentTemp,
    }
  } catch (error) {
    console.warn('[WeatherReminder] Open-Meteo fetch failed:', error)
    return null
  }
}

/**
 * Formats notification title and body according to reminder data.
 * If data is available: "Good morning! Karachi: 27°C, haze. High 29°, low 26°."
 * Fallback: "Check today's weather for Karachi."
 */
export function formatReminderNotification(
  cityName: string,
  data: ReminderWeatherData | null,
  unit: 'c' | 'f' = 'c'
): NotificationPayload {
  if (data) {
    const toUnit = (celsius: number) => {
      const value = Math.round(unit === 'f' ? (celsius * 9) / 5 + 32 : celsius)
      return value === 0 ? 0 : value // avoids "-0"
    }
    const temp = toUnit(data.tempC)
    const high = toUnit(data.highC)
    const low = toUnit(data.lowC)
    const symbol = unit === 'f' ? '°F' : '°C'
    return {
      title: 'Good morning!',
      body: `${cityName}: ${temp}${symbol}, ${data.description}. High ${high}°, low ${low}°.`,
    }
  }

  return {
    title: `${cityName} Weather Reminder`,
    body: `Check today's weather for ${cityName}.`,
  }
}

/**
 * Returns the current calendar date in local time as 'YYYY-MM-DD'.
 */
export function getTodayLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Checks if the current local time is at or after the target reminder time ('HH:mm').
 */
export function isTimeAtOrAfter(reminderTime: string, now = new Date()): boolean {
  const parts = reminderTime.split(':')
  if (parts.length !== 2) return false
  const targetHour = Number(parts[0])
  const targetMinute = Number(parts[1])

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const targetMinutes = targetHour * 60 + targetMinute

  return currentMinutes >= targetMinutes
}

/**
 * Calculates milliseconds until the next scheduled reminder time.
 * If the time has already passed today, schedules for tomorrow.
 */
export function getMsUntilNextReminder(reminderTime: string, now = new Date()): number {
  const parts = reminderTime.split(':')
  if (parts.length !== 2) return 60_000
  const targetHour = Number(parts[0])
  const targetMinute = Number(parts[1])

  const targetDate = new Date(now)
  targetDate.setHours(targetHour, targetMinute, 0, 0)

  // If reminder time has already passed today, schedule for tomorrow
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  return Math.max(1000, targetDate.getTime() - now.getTime())
}