/**
 * Weather Service Coordinator
 *
 * Tries OpenWeatherMap as the primary provider.
 * Automatically falls back to Open-Meteo on ANY non-network failure:
 * - HTTP 401 / 403 (API key invalid or not yet activated)
 * - HTTP 429 (rate limit reached)
 * - HTTP 5xx (server outage)
 * - Timeout (OpenWeatherMap took longer than 6 seconds)
 * - Malformed JSON or response mapping errors
 *
 * Does NOT fall back on genuine network failures (offline), instead throwing the network error immediately.
 * User-cancelled requests (AbortError) are silently propagated without triggering a fallback.
 */

import { City, WeatherError, WeatherReport } from '../types'
import { fetchOpenMeteoWeather } from './openMeteoService'
import { fetchOwmWeather } from './owmService'

export async function getWeather(city: City, signal?: AbortSignal): Promise<WeatherReport> {
  // If caller is already aborted, throw AbortError immediately
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  try {
    return await fetchOwmWeather(city, signal)
  } catch (error: unknown) {
    // If the CALLER cancelled (user changed city / component unmounted), propagate immediately — do not fallback.
    if (signal?.aborted || (error as { name?: string })?.name === 'AbortError') {
      throw error
    }

    // Offline / genuine network failure: do NOT fallback, surface immediately
    if (error instanceof WeatherError && error.kind === 'network') {
      throw error
    }

    // For ALL OTHER OWM failures (auth, rate_limit, server, timeout, unknown, parsing/mapping):
    // Fall back to Open-Meteo!
    const failureReason = error instanceof WeatherError ? error.kind : (error as Error)?.message || 'error'
    console.warn(`[WeatherService] OpenWeatherMap failed (${failureReason}). Falling back to Open-Meteo.`)

    try {
      return await fetchOpenMeteoWeather(city, signal)
    } catch (fallbackError: unknown) {
      if (signal?.aborted || (fallbackError as { name?: string })?.name === 'AbortError') {
        throw fallbackError
      }

      if (fallbackError instanceof WeatherError) {
        throw fallbackError
      }

      const msg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      throw new WeatherError('unknown', 'all', `Both OpenWeatherMap and Open-Meteo failed: ${msg}`)
    }
  }
}
