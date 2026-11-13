import React, { useEffect, useState } from 'react'
import { AlertCircle, Droplets, Loader2, Star, Thermometer, Wind } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { WeatherReport } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { WeatherIcon } from './WeatherIcon'

interface CurrentWeatherProps {
  report: WeatherReport
  isRefreshing?: boolean
}

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

export const CurrentWeather: React.FC<CurrentWeatherProps> = ({ report, isRefreshing = false }) => {
  const { city, current, timezoneOffsetSeconds, source, fetchedAt } = report
  const { isFavorite, add, remove } = useFavorites()

  const [limitNotice, setLimitNotice] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const isFav = isFavorite(city)
  const locationDetails = [city.region, city.country].filter(Boolean).join(', ')
  const windKmH = Math.round(current.windSpeedMs * 3.6)
  const updatedTime = formatCityTime(fetchedAt, timezoneOffsetSeconds)

  // Clear limit notice when city changes
  useEffect(() => {
    setLimitNotice(null)
  }, [city.id])

  const handleToggleFavorite = () => {
    if (isFav) {
      setIsConfirmOpen(true)
    } else {
      const res = add(city)
      if (!res.ok && res.reason === 'full') {
        setLimitNotice('You can save up to 5 cities. Remove one to add another.')
      } else {
        setLimitNotice(null)
      }
    }
  }

  const handleConfirmRemove = () => {
    remove(city.id)
    setIsConfirmOpen(false)
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-7 backdrop-blur-md shadow-xl">
        {/* Header Info: Location, Star Toggle & Updated Timestamp */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
                {city.name}
              </h2>

              {city.countryCode && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-300 border border-slate-700/60">
                  {city.countryCode}
                </span>
              )}

              {/* Favourite Star Toggle */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-pressed={isFav}
                aria-label={
                  isFav
                    ? `Remove ${city.name} from favourites`
                    : `Add ${city.name} to favourites`
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/50 text-slate-400 transition-colors hover:border-slate-700 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 active:scale-95"
              >
                <Star
                  className={`h-5 w-5 transition-transform ${
                    isFav
                      ? 'fill-amber-400 text-amber-400 scale-105'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {locationDetails && (
              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                {locationDetails}
              </p>
            )}

            {/* Inline Limit Notice */}
            {limitNotice && (
              <p
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-400 animate-fadeIn"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{limitNotice}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {source === 'open-meteo' && (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                Data from Open-Meteo (backup source)
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              {isRefreshing && (
                <Loader2
                  className="h-3 w-3 animate-spin text-slate-500"
                  aria-label="Refreshing weather data"
                />
              )}
              Last updated {updatedTime}
            </span>
          </div>
        </div>

        {/* Main Temp & Condition */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/60 shadow-inner sm:h-20 sm:w-20">
              <WeatherIcon
                condition={current.condition}
                isNight={current.isNight}
                className="h-10 w-10 sm:h-12 sm:w-12"
              />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
                  {Math.round(current.tempC)}
                </span>
                <span className="text-2xl font-light text-slate-400 sm:text-3xl">°C</span>
              </div>
              <p className="mt-0.5 text-sm font-medium text-slate-300 sm:text-base">
                {current.description}
              </p>
            </div>
          </div>

          {/* Feels Like Pill */}
          {current.feelsLikeC !== undefined && (
            <div className="flex items-center gap-1.5 self-start rounded-xl border border-slate-800/80 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 sm:self-center">
              <Thermometer className="h-3.5 w-3.5 text-slate-400" />
              <span>Feels like <strong className="text-slate-100">{Math.round(current.feelsLikeC)}°C</strong></span>
            </div>
          )}
        </div>

        {/* Weather Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800/70 pt-5 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-900/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Droplets className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-400">Humidity</span>
              <span className="text-sm font-semibold text-slate-200">{current.humidity}%</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-900/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wind className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-400">Wind Speed</span>
              <span className="text-sm font-semibold text-slate-200">{windKmH} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Star Button */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={`Remove ${city.name} from favourites?`}
        description="This will remove the city from your quick-access favourites panel."
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  )
}
