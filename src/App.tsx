import { useEffect, useRef, useState } from 'react'
import { CitySearch } from './components/CitySearch'
import { CurrentWeather } from './components/CurrentWeather'
import { ErrorState } from './components/ErrorState'
import { FavoritesPanel } from './components/FavoritesPanel'
import { ForecastList } from './components/ForecastList'
import { OfflineBanner } from './components/OfflineBanner'
import { ReminderSettings } from './components/ReminderSettings'
import { WeatherSkeleton } from './components/WeatherSkeleton'
import { useForegroundReminder } from './hooks/useForegroundReminder'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useWeather } from './hooks/useWeather'
import { readLastCity, readLastWeatherReport } from './lib/safeStorage'
import { City } from './types'

function formatCityTime(isoString: string, timezoneOffsetSeconds: number): string {
  try {
    const utcMs = new Date(isoString).getTime()
    const localDate = new Date(utcMs + timezoneOffsetSeconds * 1000)
    const hours = String(localDate.getUTCHours()).padStart(2, '0')
    const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return '--:--'
  }
}

export default function App() {
  const isOnline = useOnlineStatus()
  const prevOnlineRef = useRef(isOnline)

  // Initialize selected city exactly once from safe storage on mount
  const [selectedCity, setSelectedCity] = useState<City | null>(() => {
    return readLastCity() || readLastWeatherReport()?.city || null
  })

  const { report, status, error, retry, isRefreshing } = useWeather(selectedCity)

  // In-app foreground reminder fallback (checks on load, visibilitychange, and timeouts)
  useForegroundReminder()

  // Track latest references to prevent stale closures without re-triggering the online effect
  const selectedCityRef = useRef(selectedCity)
  selectedCityRef.current = selectedCity
  const retryRef = useRef(retry)
  retryRef.current = retry

  // Auto-refresh ONLY on an actual offline -> online transition
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current
    prevOnlineRef.current = isOnline

    if (wasOffline && isOnline && selectedCityRef.current) {
      retryRef.current()
    }
  }, [isOnline])

  const lastUpdatedTime = report
    ? formatCityTime(report.fetchedAt, report.timezoneOffsetSeconds)
    : undefined

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-slate-800 selection:text-slate-200">
      {/* Offline Status Banner */}
      <OfflineBanner
        isOnline={isOnline}
        cityName={report?.city.name}
        lastUpdatedTime={lastUpdatedTime}
      />

      {/* Sticky Mobile-First Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60 shadow-xs">
              <span className="text-xs font-semibold text-slate-200">WB</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
              WeatherBoard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            {/* Main Column: Search & Weather Display */}
            <div className="space-y-6 lg:col-span-8">
              {/* City Search Bar */}
              <section aria-label="City Search">
                <CitySearch onSelect={setSelectedCity} />
              </section>

              {/* Mobile/Tablet Compact Favourites Panel (< 1024px) */}
              <div className="block lg:hidden">
                <FavoritesPanel
                  selectedCityId={selectedCity?.id ?? null}
                  onSelectCity={setSelectedCity}
                />
              </div>

              {/* Dynamic Weather Content */}
              {status === 'loading' && (
                <section aria-label="Loading Weather">
                  <WeatherSkeleton />
                </section>
              )}

              {status === 'error' && error && (
                <section aria-label="Weather Error">
                  <ErrorState error={error} onRetry={retry} />
                </section>
              )}

              {status === 'success' && report && (
                <section aria-label="Weather Report" className="space-y-6 animate-fadeIn">
                  <CurrentWeather report={report} isRefreshing={isRefreshing} />
                  <ForecastList daily={report.daily} />
                </section>
              )}

              {status === 'idle' && (
                <section
                  aria-label="Empty State"
                  className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 sm:p-8 backdrop-blur-xs"
                >
                  <div className="flex flex-col items-center justify-center text-center py-10 sm:py-14">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 shadow-inner">
                      <svg
                        className="h-6 w-6 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-base font-medium text-slate-200 sm:text-lg">
                      Search for a city
                    </h2>
                    <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-slate-400">
                      Type at least 2 characters to discover cities and inspect current weather along with a 5-day forecast.
                    </p>
                  </div>
                </section>
              )}

              {/* Mobile/Tablet Reminder Settings (< 1024px) placed below weather */}
              <div className="block lg:hidden">
                <ReminderSettings
                  city={selectedCity}
                  currentReport={report}
                />
              </div>
            </div>

            {/* Desktop Sidebar: Favourites & Reminder Settings (>= 1024px) */}
            <aside aria-label="Sidebar" className="hidden lg:col-span-4 lg:block lg:sticky lg:top-20 space-y-6">
              <FavoritesPanel
                selectedCityId={selectedCity?.id ?? null}
                onSelectCity={setSelectedCity}
              />
              <ReminderSettings
                city={selectedCity}
                currentReport={report}
              />
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
