/**
 * Open-Meteo Service
 *
 * Automatic fallback provider when OpenWeatherMap fails with auth, 429, or 5xx.
 * Uses https://api.open-meteo.com/v1/forecast.
 */

import { City, CurrentWeather, DailyForecast, WeatherCondition, WeatherError, WeatherReport } from '../types'

interface OpenMeteoResponse {
  utc_offset_seconds: number
  timezone: string
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature?: number
    wind_speed_10m: number
    weather_code: number
    is_day: number // 1 = day, 0 = night
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export function mapWmoCode(code: number): { condition: WeatherCondition; description: string } {
  switch (code) {
    case 0:
      return { condition: 'clear', description: 'Clear sky' }
    case 1:
      return { condition: 'partly-cloudy', description: 'Mainly clear' }
    case 2:
      return { condition: 'partly-cloudy', description: 'Partly cloudy' }
    case 3:
      return { condition: 'cloudy', description: 'Overcast' }
    case 45:
    case 48:
      return { condition: 'fog', description: 'Fog' }
    case 51:
      return { condition: 'drizzle', description: 'Light drizzle' }
    case 53:
      return { condition: 'drizzle', description: 'Moderate drizzle' }
    case 55:
      return { condition: 'drizzle', description: 'Dense drizzle' }
    case 56:
    case 57:
      return { condition: 'drizzle', description: 'Freezing drizzle' }
    case 61:
      return { condition: 'rain', description: 'Slight rain' }
    case 63:
      return { condition: 'rain', description: 'Moderate rain' }
    case 65:
      return { condition: 'rain', description: 'Heavy rain' }
    case 66:
    case 67:
      return { condition: 'rain', description: 'Freezing rain' }
    case 71:
      return { condition: 'snow', description: 'Slight snow fall' }
    case 73:
      return { condition: 'snow', description: 'Moderate snow fall' }
    case 75:
      return { condition: 'snow', description: 'Heavy snow fall' }
    case 77:
      return { condition: 'snow', description: 'Snow grains' }
    case 80:
      return { condition: 'rain', description: 'Slight rain showers' }
    case 81:
      return { condition: 'rain', description: 'Moderate rain showers' }
    case 82:
      return { condition: 'rain', description: 'Violent rain showers' }
    case 85:
    case 86:
      return { condition: 'snow', description: 'Snow showers' }
    case 95:
      return { condition: 'thunderstorm', description: 'Thunderstorm' }
    case 96:
    case 99:
      return { condition: 'thunderstorm', description: 'Thunderstorm with hail' }
    default:
      return { condition: 'partly-cloudy', description: 'Partly cloudy' }
  }
}

export async function fetchOpenMeteoWeather(city: City, signal?: AbortSignal): Promise<WeatherReport> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(city.latitude))
  url.searchParams.set('longitude', String(city.longitude))
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day'
  )
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '5')
  url.searchParams.set('wind_speed_unit', 'ms')

  let response: Response

  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      signal,
    })
  } catch (error: unknown) {
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error as { name?: string })?.name === 'AbortError'
    ) {
      throw error
    }
    throw new WeatherError('network', 'open-meteo', 'Network error connecting to Open-Meteo.')
  }

  if (!response.ok) {
    const status = response.status
    if (status === 429) {
      throw new WeatherError('rate_limit', 'open-meteo', 'Open-Meteo rate limit exceeded.', status)
    }
    if (status >= 500 && status < 600) {
      throw new WeatherError('server', 'open-meteo', `Open-Meteo server error (HTTP ${status}).`, status)
    }
    throw new WeatherError('unknown', 'open-meteo', `Unexpected Open-Meteo error (HTTP ${status}).`, status)
  }

  let json: OpenMeteoResponse
  try {
    json = (await response.json()) as OpenMeteoResponse
  } catch {
    throw new WeatherError('server', 'open-meteo', 'Failed to parse Open-Meteo response JSON.')
  }

  const currentWmo = mapWmoCode(json.current.weather_code)
  const isNight = json.current.is_day === 0

  const current: CurrentWeather = {
    tempC: json.current.temperature_2m,
    feelsLikeC: json.current.apparent_temperature,
    humidity: json.current.relative_humidity_2m,
    windSpeedMs: json.current.wind_speed_10m,
    condition: currentWmo.condition,
    description: currentWmo.description,
    isNight,
    observedAt: new Date().toISOString(),
  }

  const daily: DailyForecast[] = []
  const daysCount = Math.min(5, json.daily.time.length)

  for (let i = 0; i < daysCount; i++) {
    const code = json.daily.weather_code[i] ?? 0
    const wmo = mapWmoCode(code)
    daily.push({
      date: json.daily.time[i],
      minC: Math.round((json.daily.temperature_2m_min[i] ?? 0) * 10) / 10,
      maxC: Math.round((json.daily.temperature_2m_max[i] ?? 0) * 10) / 10,
      condition: wmo.condition,
      description: wmo.description,
    })
  }

  return {
    city,
    current,
    daily,
    timezoneOffsetSeconds: json.utc_offset_seconds ?? 0,
    source: 'open-meteo',
    fetchedAt: new Date().toISOString(),
  }
}
