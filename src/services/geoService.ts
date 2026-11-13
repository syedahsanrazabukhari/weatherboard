/**
 * GeoDB Cities Service
 *
 * RATE LIMIT & ARCHITECTURE DECISION:
 * The GeoDB Cities free tier on RapidAPI enforces a strict quota of 1 request per second (1 req/sec).
 * To prevent HTTP 429 penalties:
 * 1. An in-memory cache (Map keyed by lowercase query) avoids repeated network hits for the same search term.
 * 2. A request scheduler enforces at least ~1100ms between real network dispatches.
 * 3. Client keystrokes are debounced by at least 300ms in `useCitySearch`.
 * 4. Stale/superseded requests are aborted via `AbortSignal`.
 * 5. In case of an HTTP 429, the service automatically retries once after ~1.2s before surfacing a `rate_limit` GeoError.
 */

import { env } from '../lib/env'
import { City, GeoError } from '../types'

interface GeoDbCityItem {
  id: number | string
  name?: string
  city?: string
  region?: string
  country?: string
  countryCode?: string
  latitude?: number | string
  longitude?: number | string
}

interface GeoDbResponse {
  data?: GeoDbCityItem[]
}

const GEO_API_ENDPOINT = 'https://wft-geo-db.p.rapidapi.com/v1/geo/cities'
const MIN_REQUEST_INTERVAL_MS = 1100
const RETRY_429_DELAY_MS = 1200

// In-memory cache for repeated searches
const queryCache = new Map<string, City[]>()

// Request scheduling state
let lastNetworkCallTimestamp = 0
let schedulerQueue: Promise<void> = Promise.resolve()

function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort)
  })
}

async function waitForScheduleSlot(signal?: AbortSignal): Promise<void> {
  const currentSlot = schedulerQueue.then(async () => {
    const now = Date.now()
    const elapsed = now - lastNetworkCallTimestamp
    const waitTime = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed)

    if (waitTime > 0) {
      await delayWithSignal(waitTime, signal)
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    lastNetworkCallTimestamp = Date.now()
  })

  // Prevent queue disruption if one search was cancelled
  schedulerQueue = currentSlot.catch(() => {})

  await currentSlot
}

async function executeFetch(url: string, signal?: AbortSignal, isRetry = false): Promise<City[]> {
  await waitForScheduleSlot(signal)

  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': env.RAPIDAPI_KEY,
        'x-rapidapi-host': env.RAPIDAPI_HOST || 'wft-geo-db.p.rapidapi.com',
      },
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
    throw new GeoError('network', 'Network connection failed. You appear to be offline.')
  }

  if (response.status === 429) {
    if (!isRetry) {
      // Automatically retry once after ~1.2s before failing
      await delayWithSignal(RETRY_429_DELAY_MS, signal)
      return executeFetch(url, signal, true)
    }

    throw new GeoError(
      'rate_limit',
      'Too many requests to GeoDB Cities API (1 req/sec limit exceeded).',
      429
    )
  }

  if (!response.ok) {
    const status = response.status
    if (status === 401 || status === 403) {
      throw new GeoError(
        'auth',
        'Authentication failed. RapidAPI key or host is invalid.',
        status
      )
    }
    if (status >= 500 && status < 600) {
      throw new GeoError(
        'server',
        `GeoDB service is currently unavailable (HTTP ${status}).`,
        status
      )
    }
    throw new GeoError(
      'unknown',
      `Unexpected response from GeoDB API (HTTP ${status}).`,
      status
    )
  }

  let json: GeoDbResponse
  try {
    json = await response.json()
  } catch {
    throw new GeoError('server', 'Failed to parse response from GeoDB Cities API.')
  }

  const items = Array.isArray(json?.data) ? json.data : []

  return items.map((item): City => ({
    id: Number(item.id),
    name: String(item.name || item.city || '').trim(),
    region: String(item.region || '').trim(),
    country: String(item.country || '').trim(),
    countryCode: String(item.countryCode || '').trim().toUpperCase(),
    latitude: Number(item.latitude ?? 0),
    longitude: Number(item.longitude ?? 0),
  }))
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return []
  }

  const cacheKey = trimmedQuery.toLowerCase()
  const cached = queryCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const url = new URL(GEO_API_ENDPOINT)
  url.searchParams.set('namePrefix', trimmedQuery)
  url.searchParams.set('limit', '5')
  url.searchParams.set('sort', '-population')
  url.searchParams.set('types', 'CITY')

  const cities = await executeFetch(url.toString(), signal)
  queryCache.set(cacheKey, cities)
  return cities
}
