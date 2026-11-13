import { useCallback, useEffect, useRef, useState } from 'react'
import {
  readLastCity,
  readLastWeatherReport,
  writeLastCity,
  writeLastWeatherReport,
} from '../lib/safeStorage'
import { getWeather } from '../services/weatherService'
import { City, WeatherError, WeatherReport } from '../types'

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseWeatherReturn {
  report: WeatherReport | null
  status: WeatherStatus
  error: WeatherError | null
  retry: () => void
  isRefreshing: boolean
}

export function useWeather(city: City | null): UseWeatherReturn {
  // Restore saved report and city exactly once on mount
  const initialRestoreRef = useRef<{ report: WeatherReport | null; city: City | null } | null>(null)
  if (initialRestoreRef.current === null) {
    const savedReport = readLastWeatherReport()
    const savedCity = readLastCity()
    initialRestoreRef.current = {
      report: savedReport,
      city: savedCity || (savedReport ? savedReport.city : null),
    }
  }

  const initialReport = initialRestoreRef.current.report

  const [report, setReport] = useState<WeatherReport | null>(() => {
    if (city && initialReport && city.id === initialReport.city.id) {
      return initialReport
    }
    return initialReport || null
  })

  const [status, setStatus] = useState<WeatherStatus>(() => {
    return initialReport ? 'success' : 'idle'
  })

  const [error, setError] = useState<WeatherError | null>(null)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<number>(0)
  const isFirstMountRef = useRef<boolean>(true)

  // Keep latest city and report in refs to avoid recreating callbacks or triggering effects
  const cityRef = useRef<City | null>(city)
  cityRef.current = city

  const reportRef = useRef<WeatherReport | null>(report)
  reportRef.current = report

  // Extract primitive cityId
  const cityId = city?.id

  useEffect(() => {
    if (cityId === undefined || !cityRef.current) {
      requestIdRef.current++
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      setReport(null)
      setStatus('idle')
      setError(null)
      setIsRefreshing(false)
      return
    }

    const targetCity = cityRef.current
    const isFirstMount = isFirstMountRef.current
    isFirstMountRef.current = false

    // Stale-while-revalidate:
    // If a report for this same city is already present (restored or previously loaded),
    // keep it visible without clearing or showing the skeleton.
    const hasDataForThisCity = reportRef.current?.city?.id === targetCity.id

    if (!hasDataForThisCity) {
      setStatus('loading')
      setReport(null)
      setError(null)
      setIsRefreshing(false)
    } else {
      // Background refresh: stale data stays visible, show subtle indicator
      setError(null)
      setIsRefreshing(true)
    }

    // On initial mount with saved data while offline, do not attempt immediate network refetch
    if (
      isFirstMount &&
      hasDataForThisCity &&
      typeof navigator !== 'undefined' &&
      !navigator.onLine
    ) {
      return
    }

    // Cancel any previous in-flight request and generate a unique request ID
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    const currentRequestId = ++requestIdRef.current

    async function executeFetch() {
      try {
        const freshReport = await getWeather(targetCity, controller.signal)

        // Ignore if request was cancelled or superseded by another city selection
        if (
          currentRequestId !== requestIdRef.current ||
          controller.signal.aborted ||
          cityRef.current?.id !== targetCity.id
        ) {
          return
        }

        setReport(freshReport)
        setStatus('success')
        setError(null)
        setIsRefreshing(false)

        // Persist the latest successful report and city to safe storage
        writeLastWeatherReport(freshReport)
        writeLastCity(targetCity)
      } catch (err: unknown) {
        // Silently ignore any cancellation or outdated requests
        const isAbort =
          controller.signal.aborted ||
          currentRequestId !== requestIdRef.current ||
          (err as { name?: string })?.name === 'AbortError' ||
          (err as DOMException)?.name === 'AbortError'

        if (isAbort) {
          return
        }

        if (cityRef.current?.id === targetCity.id) {
          setIsRefreshing(false)
          // If we had stale data for this city, keep showing it instead of blanking out
          if (!reportRef.current || reportRef.current.city?.id !== targetCity.id) {
            setReport(null)
            setStatus('error')
            if (err instanceof WeatherError) {
              setError(err)
            } else {
              setError(
                new WeatherError(
                  'unknown',
                  'all',
                  (err as Error)?.message || 'Unable to retrieve weather data.'
                )
              )
            }
          }
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    }

    void executeFetch()

    return () => {
      // Invalidate current request and abort in-flight fetch
      requestIdRef.current++
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [cityId, retryCount])

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1)
  }, [])

  return {
    report,
    status,
    error,
    retry,
    isRefreshing,
  }
}
