
import { useEffect, useRef, useState } from 'react'
import { CloudSun } from 'lucide-react'
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

  const [selectedCity, setSelectedCity] = useState<City | null>(() => {
    return readLastCity() || readLastWeatherReport()?.city || null
  })

  const { report, status, error, retry, isRefreshing } = useWeather(selectedCity)

  useForegroundReminder()

  const selectedCityRef = useRef(selectedCity)
  selectedCityRef.current = selectedCity

  const retryRef = useRef(retry)
  retryRef.current = retry

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
    <div className="min-h-screen flex flex-col bg-[#090909] text-[#f2f2f2] selection:bg-white/20">
      <OfflineBanner
        isOnline={isOnline}
        cityName={report?.city.name}
        lastUpdatedTime={lastUpdatedTime}
      />

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0b0b0b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-[#1c1c1c]">
              <CloudSun className="h-[19px] w-[19px] text-[#e8e0d2]" strokeWidth={1.7} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-[-0.04em] text-white sm:text-base">
                WeatherBoard
              </h1>
              <p className="hidden text-[10px] tracking-[0.16em] text-[#777] sm:block">
                WEATHER, AT A GLANCE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-[#777] sm:inline">
              Live weather dashboard
            </span>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
              isOnline
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400'
                : 'border-amber-500/20 bg-amber-500/[0.07] text-amber-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                isOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-7 flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#777]">
              Your personal weather station
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.055em] text-white sm:text-3xl">
              Weather overview<span className="text-[#777]">.</span>
            </h2>
            <p className="max-w-xl text-sm leading-6 text-[#858585]">
              Current conditions, upcoming forecasts and daily updates for the places that matter.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-7">
            <div className="min-w-0 space-y-6 lg:col-span-8">
              <section aria-label="City Search" className="relative z-30">
                <CitySearch onSelect={setSelectedCity} />
              </section>

              <div className="lg:hidden">
                <FavoritesPanel
                  selectedCityId={selectedCity?.id ?? null}
                  onSelectCity={setSelectedCity}
                />
              </div>

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
                <section aria-label="Weather Report" className="space-y-7 animate-fadeIn">
                  <CurrentWeather report={report} isRefreshing={isRefreshing} />
                  <ForecastList daily={report.daily} />
                </section>
              )}

              {status === 'idle' && (
                <section
                  aria-label="Empty State"
                  className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111] px-6 py-14 text-center sm:py-20"
                >
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#1b1b1b]">
                    <CloudSun className="h-7 w-7 text-[#b5a58e]" strokeWidth={1.4} />
                  </div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#777]">
                    Start exploring
                  </p>
                  <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                    Search for a city
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#858585]">
                    Find a location to see its current weather, conditions and five-day forecast.
                  </p>
                </section>
              )}

              <div className="lg:hidden">
                <ReminderSettings city={selectedCity} currentReport={report} />
              </div>
            </div>

            <aside aria-label="Dashboard Sidebar" className="hidden space-y-6 lg:col-span-4 lg:block lg:sticky lg:top-24">
              <FavoritesPanel
                selectedCityId={selectedCity?.id ?? null}
                onSelectCity={setSelectedCity}
              />
              <ReminderSettings city={selectedCity} currentReport={report} />
            </aside>
          </div>

          <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-[11px] text-[#666] sm:flex-row">
            <span>WeatherBoard · Clear skies, clear decisions.</span>
            <span className="flex items-center gap-1.5">
              Built for everyday forecasts
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}
