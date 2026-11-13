import { useCallback, useEffect, useRef, useState } from 'react'
import { searchCities } from '../services/geoService'
import { City, GeoError } from '../types'

export type CitySearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export interface UseCitySearchReturn {
  query: string
  setQuery: (query: string) => void
  results: City[]
  status: CitySearchStatus
  error: GeoError | null
  retry: () => void
}

const DEBOUNCE_DELAY_MS = 300

export function useCitySearch(): UseCitySearchReturn {
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<City[]>([])
  const [status, setStatus] = useState<CitySearchStatus>('idle')
  const [error, setError] = useState<GeoError | null>(null)

  // Track the in-flight AbortController and latest active query
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryRef = useRef<string>(query)
  queryRef.current = query

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim()

    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      setResults([])
      setStatus('idle')
      setError(null)
      return
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setStatus('loading')
    setError(null)

    try {
      const cities = await searchCities(trimmed, controller.signal)

      // Ensure this response matches the current query and was not cancelled
      if (queryRef.current.trim() === trimmed && !controller.signal.aborted) {
        setResults(cities)
        setStatus(cities.length === 0 ? 'empty' : 'success')
        setError(null)
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || (err as { name?: string })?.name === 'AbortError') {
        return // Ignore cancelled / outdated requests
      }

      if (queryRef.current.trim() === trimmed) {
        setResults([])
        setStatus('error')
        if (err instanceof GeoError) {
          setError(err)
        } else {
          setError(new GeoError('unknown', 'An unexpected error occurred while searching cities.'))
        }
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const trimmed = query.trim()

    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      setResults([])
      setStatus('idle')
      setError(null)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      void executeSearch(trimmed)
    }, DEBOUNCE_DELAY_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, executeSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const retry = useCallback(() => {
    void executeSearch(query)
  }, [executeSearch, query])

  return {
    query,
    setQuery,
    results,
    status,
    error,
    retry,
  }
}
