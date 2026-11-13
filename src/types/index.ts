export interface City {
  id: number
  name: string
  region: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
}

export type GeoErrorKind = 'network' | 'rate_limit' | 'auth' | 'server' | 'unknown'

export class GeoError extends Error {
  readonly kind: GeoErrorKind
  readonly status?: number

  constructor(kind: GeoErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'GeoError'
    this.kind = kind
    this.status = status
    Object.setPrototypeOf(this, GeoError.prototype)
  }
}

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm'
  | 'snow'

export interface CurrentWeather {
  tempC: number
  feelsLikeC?: number
  humidity: number
  windSpeedMs: number
  condition: WeatherCondition
  description: string
  isNight: boolean
  observedAt: string
}

export interface DailyForecast {
  date: string // YYYY-MM-DD in the city's local timezone
  minC: number
  maxC: number
  condition: WeatherCondition
  description: string
}

export interface WeatherReport {
  city: City
  current: CurrentWeather
  daily: DailyForecast[] // exactly 5 days
  timezoneOffsetSeconds: number
  source: 'openweathermap' | 'open-meteo'
  fetchedAt: string
}

export type WeatherErrorKind =
  | 'network'
  | 'rate_limit'
  | 'auth'
  | 'server'
  | 'not_found'
  | 'timeout'
  | 'unknown'

export type WeatherProvider = 'openweathermap' | 'open-meteo' | 'all'

export class WeatherError extends Error {
  readonly kind: WeatherErrorKind
  readonly provider: WeatherProvider
  readonly status?: number

  constructor(kind: WeatherErrorKind, provider: WeatherProvider, message: string, status?: number) {
    super(message)
    this.name = 'WeatherError'
    this.kind = kind
    this.provider = provider
    this.status = status
    Object.setPrototypeOf(this, WeatherError.prototype)
  }
}
