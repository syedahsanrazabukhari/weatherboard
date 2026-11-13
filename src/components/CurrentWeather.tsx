
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
      <article className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111] shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-semibold tracking-[-0.055em] text-white sm:text-3xl">
                  {city.name}
                </h2>
                {city.countryCode && (
                  <span className="rounded-md border border-white/10 bg-[#1c1c1c] px-2 py-1 font-mono text-[10px] tracking-wider text-[#aaa]">
                    {city.countryCode}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-pressed={isFav}
                  aria-label={isFav ? `Remove ${city.name} from favourites` : `Add ${city.name} to favourites`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#1c1c1c] text-[#999] transition hover:border-amber-400/30 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                >
                  <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
              {locationDetails && (
                <p className="mt-1 text-sm text-[#858585]">{locationDetails}</p>
              )}
              {limitNotice && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {limitNotice}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#777]">
              {source === 'open-meteo' && (
                <span className="rounded-md border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-1 text-amber-300">
                  Backup data source
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-[#191919] px-2.5 py-1.5 font-mono">
                {isRefreshing && <Loader2 className="h-3 w-3 animate-spin" />}
                Updated {updatedTime}
              </span>
            </div>
          </div>

          <div className="mt-9 grid grid-cols-1 items-center gap-7 sm:grid-cols-[1fr_auto] sm:gap-4">
            <div className="flex items-center gap-5 sm:gap-7">
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a1a1a] sm:h-28 sm:w-28">
                <WeatherIcon
                  condition={current.condition}
                  isNight={current.isNight}
                  className="h-12 w-12 sm:h-[60px] sm:w-[60px]"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-start leading-none">
                  <span className="text-[76px] font-light tracking-[-0.09em] text-white sm:text-[96px]">
                    {Math.round(current.tempC)}
                  </span>
                  <span className="ml-1 mt-2 text-3xl font-light text-[#888] sm:text-4xl">°</span>
                </div>
                <p className="mt-2 text-sm font-medium capitalize text-[#c5c5c5] sm:text-base">
                  {current.description}
                </p>
                {current.feelsLikeC !== undefined && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#777]">
                    <Thermometer className="h-3.5 w-3.5" />
                    Feels like {Math.round(current.feelsLikeC)}°C
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="rounded-lg border border-white/[0.08] bg-[#191919] px-3 py-2 text-xs text-[#aaa]">
                Celsius
              </span>
            </div>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-5">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#171717] p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#25221d] text-[#d6b77a]">
                <Droplets className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#777]">Humidity</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-[#eee]">{current.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#171717] p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#202426] text-[#aab9bd]">
                <Wind className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#777]">Wind speed</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-[#eee]">{windKmH} km/h</p>
              </div>
            </div>
          </div>
        </div>
      </article>

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
