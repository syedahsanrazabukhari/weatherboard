
/**
 * Shared Weather Reminder Notification Module
 *
 * Safe for Window and ServiceWorkerGlobalScope.
 * Does not access window or localStorage.
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

export const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
] as const

function getWmoDescription(code: number): string {
  switch (code) {
    case 0: return 'clear sky'
    case 1: return 'mainly clear'
    case 2: return 'partly cloudy'
    case 3: return 'overcast'
    case 45:
    case 48: return 'fog'
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: return 'drizzle'
    case 61:
    case 63:
    case 65:
    case 66:
    case 67: return 'rain'
    case 71:
    case 73:
    case 75:
    case 77: return 'snow'
    case 80:
    case 81:
    case 82: return 'rain showers'
    case 85:
    case 86: return 'snow showers'
    case 95:
    case 96:
    case 99: return 'thunderstorm'
    default: return 'partly cloudy'
  }
}

/**
 * Fetches weather from Open-Meteo.
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

    if (!res.ok) return null

    const json = await res.json() as {
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

    if (typeof currentTemp !== 'number') return null

    return {
      tempC: currentTemp,
      description: getWmoDescription(weatherCode),
      highC: typeof high === 'number' ? high : currentTemp,
      lowC: typeof low === 'number' ? low : currentTemp,
    }
  } catch (error) {
    console.warn('[WeatherReminder] Weather fetch failed:', error)
    return null
  }
}

/**
 * Builds a weather notification.
 */
export function formatReminderNotification(
  cityName: string,
  data: ReminderWeatherData | null,
  unit: 'c' | 'f' = 'c'
): NotificationPayload {
  if (data) {
    const toUnit = (celsius: number) =>
      Math.round(unit === 'f' ? (celsius * 9) / 5 + 32 : celsius)

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
 * Returns the local date in YYYY-MM-DD format.
 */
export function getTodayLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Checks whether the current time has reached the specified time.
 */
export function isTimeAtOrAfter(
  reminderTime: string,
  now = new Date()
): boolean {
  const parts = reminderTime.split(':')

  if (parts.length !== 2) return false

  const targetHour = Number(parts[0])
  const targetMinute = Number(parts[1])

  if (
    !Number.isInteger(targetHour) ||
    !Number.isInteger(targetMinute) ||
    targetHour < 0 ||
    targetHour > 23 ||
    targetMinute < 0 ||
    targetMinute > 59
  ) {
    return false
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const targetMinutes = targetHour * 60 + targetMinute

  return currentMinutes >= targetMinutes
}

/**
 * Determines whether a reminder is due today.
 * JavaScript weekday values: Sunday=0 ... Saturday=6.
 */
export function isReminderDue(
  reminderTime: string,
  days: number[],
  now = new Date()
): boolean {
  return (
    days.includes(now.getDay()) &&
    isTimeAtOrAfter(reminderTime, now)
  )
}

/**
 * Calculates the milliseconds until the next occurrence of a selected weekday.
 *
 * If today's selected reminder time has already passed,
 * the next selected weekday is used.
 */
export function getMsUntilNextScheduledReminder(
  reminderTime: string,
  days: number[],
  now = new Date()
): number {
  const parts = reminderTime.split(':')

  if (parts.length !== 2 || days.length === 0) {
    return 7 * 24 * 60 * 60 * 1000
  }

  const hour = Number(parts[0])
  const minute = Number(parts[1])

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    return 7 * 24 * 60 * 60 * 1000
  }

  for (let offset = 0; offset <= 7; offset++) {
    const target = new Date(now)

    target.setDate(target.getDate() + offset)
    target.setHours(hour, minute, 0, 0)

    if (
      days.includes(target.getDay()) &&
      target.getTime() > now.getTime()
    ) {
      return Math.max(1000, target.getTime() - now.getTime())
    }
  }

  return 7 * 24 * 60 * 60 * 1000
}

/**
 * Original daily helper retained for compatibility with existing tests.
 */
export function getMsUntilNextReminder(
  reminderTime: string,
  now = new Date()
): number {
  const parts = reminderTime.split(':')

  if (parts.length !== 2) return 60_000

  const targetHour = Number(parts[0])
  const targetMinute = Number(parts[1])

  const targetDate = new Date(now)

  targetDate.setHours(targetHour, targetMinute, 0, 0)

  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  return Math.max(1000, targetDate.getTime() - now.getTime())
}
