import React from 'react'
import { useUnit } from '../hooks/useUnit'
import { tempValue } from '../lib/units'
import { DailyForecast } from '../types'
import { WeatherIcon } from './WeatherIcon'

interface ForecastListProps {
  daily: DailyForecast[]
}

function formatWeekday(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  } catch {
    return ''
  }
}

export const ForecastList: React.FC<ForecastListProps> = ({ daily }) => {
  const { unit } = useUnit()
  const weekMin = Math.min(...daily.map((d) => d.minC))
  const weekMax = Math.max(...daily.map((d) => d.maxC))
  const span = Math.max(1, weekMax - weekMin)

  return (
    <section aria-labelledby="forecast-heading" className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h3 id="forecast-heading" className="text-lg font-semibold tracking-[-0.03em] text-fg">
          5-day forecast
        </h3>
        <span className="text-xs text-fg-3">Low to high, per day</span>
      </div>

      <ul className="space-y-2">
        {daily.map((day, idx) => {
          const weekday = formatWeekday(day.date, idx)
          const dateLabel = formatDisplayDate(day.date)
          const left = ((day.minC - weekMin) / span) * 100
          const width = Math.max(8, ((day.maxC - day.minC) / span) * 100)

          return (
            <li
              key={day.date}
              aria-label={`${weekday}, ${day.description}, high ${tempValue(day.maxC, unit)} degrees, low ${tempValue(day.minC, unit)} degrees`}
              style={{ animationDelay: `${idx * 70}ms` }}
              className={`animate-rise grid grid-cols-[60px_44px_minmax(0,1fr)] items-center gap-x-3 rounded-2xl border px-3 py-2.5 sm:grid-cols-[84px_48px_130px_minmax(0,1fr)] sm:gap-x-4 sm:px-5 ${
                idx === 0
                  ? 'border-line-2 bg-fill-2'
                  : 'border-line bg-fill transition-colors hover:bg-fill'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{weekday}</p>
                <p className="text-[11px] text-fg-3">{dateLabel}</p>
              </div>

              <WeatherIcon condition={day.condition} className="h-9 w-9 sm:h-10 sm:w-10" />

              <p
                className="hidden truncate text-sm capitalize text-fg-2 sm:block"
                title={day.description}
              >
                {day.description}
              </p>

              <div className="flex items-center gap-2.5">
                <span className="w-8 text-right text-sm tabular-nums text-fg-2">
                  {tempValue(day.minC, unit)}°
                </span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-fill-2">
                  <div
                    className="animate-barGrow absolute inset-y-0 rounded-full bg-gradient-to-r from-bar-from via-[#f2d79a] to-[#ff9d3c]"
                    style={{
                      left: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                      animationDelay: `${180 + idx * 70}ms`,
                    }}
                  />
                </div>
                <span className="w-8 text-sm font-semibold tabular-nums text-fg">
                  {tempValue(day.maxC, unit)}°
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}