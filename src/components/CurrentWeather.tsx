import React, { useEffect, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Droplets, Loader2, Star, Thermometer, Wind } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { useUnit } from '../hooks/useUnit'
import { tempValue, unitSymbol, windUnitLabel, windValue } from '../lib/units'
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
  const { unit } = useUnit()

  const [limitNotice, setLimitNotice] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const isFav = isFavorite(city)
  const locationDetails = [city.region, city.country].filter(Boolean).join(', ')
  const windSpeed = windValue(current.windSpeedMs, unit)
  const updatedTime = formatCityTime(fetchedAt, timezoneOffsetSeconds)
  const today = report.daily[0]

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
      <article className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-card backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-2 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fill blur-3xl" />

        <div className="relative p-5 sm:p-7 lg:p-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-semibold tracking-[-0.05em] text-fg sm:text-3xl">
                  {city.name}
                </h2>
                {city.countryCode && (
                  <span className="rounded-md border border-line bg-fill px-2 py-1 font-mono text-[10px] tracking-wider text-fg-2">
                    {city.countryCode}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-pressed={isFav}
                  aria-label={isFav ? `Remove ${city.name} from favourites` : `Add ${city.name} to favourites`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-fill text-fg-2 transition hover:border-amber-400/30 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                >
                  <Star className={`h-4 w-4 ${isFav ? 'animate-starPop fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
              {locationDetails && (
                <p className="mt-1 text-sm text-fg-2">{locationDetails}</p>
              )}
              {limitNotice && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {limitNotice}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-fg-3">
              {source === 'open-meteo' && (
                <span className="rounded-md border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-1 text-amber-300">
                  Backup data source
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-fill px-2.5 py-1.5 font-mono">
                {isRefreshing && <Loader2 className="h-3 w-3 animate-spin" />}
                Updated {updatedTime}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-6 sm:mt-10 sm:flex-row sm:gap-10">
            <div className="relative flex h-[168px] w-[168px] shrink-0 items-center justify-center sm:h-[200px] sm:w-[200px]">
              <div className="absolute inset-4 rounded-full bg-fill blur-2xl" />
              <WeatherIcon
                key={`${current.condition}-${current.isNight}`}
                condition={current.condition}
                isNight={current.isNight}
                className="relative h-full w-full animate-fadeIn"
              />
            </div>

            <div className="min-w-0 text-center sm:text-left">
              <div className="flex items-start justify-center leading-none sm:justify-start">
                <span className="text-[88px] font-extralight tabular-nums tracking-[-0.07em] text-fg sm:text-[120px]">
                  {tempValue(current.tempC, unit)}
                </span>
                <span className="ml-1 mt-3 text-3xl font-light text-fg-2 sm:mt-4 sm:text-4xl">{unitSymbol(unit)}</span>
              </div>
              <p className="mt-1 text-lg font-medium capitalize text-fg sm:text-xl">
                {current.description}
              </p>
              {today && (
                <p className="mt-2 flex items-center justify-center gap-3 text-sm tabular-nums text-fg-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUp className="h-3.5 w-3.5 text-amber-300/80" />
                    {tempValue(today.maxC, unit)}°
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ArrowDown className="h-3.5 w-3.5 text-fg-2" />
                    {tempValue(today.minC, unit)}°
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-line pt-5 min-[420px]:grid-cols-3 sm:mt-10">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-fill p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                <Thermometer className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-xs text-fg-3">Feels like</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-fg">
                  {current.feelsLikeC !== undefined ? `${tempValue(current.feelsLikeC, unit)}${unitSymbol(unit)}` : '–'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-fill p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fill-2 text-fg-2">
                <Droplets className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-xs text-fg-3">Humidity</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-fg">{current.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-fill p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fill-2 text-fg-2">
                <Wind className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-xs text-fg-3">Wind</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-fg">{windSpeed} {windUnitLabel(unit)}</p>
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