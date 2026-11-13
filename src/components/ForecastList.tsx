import React from 'react'
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
  const weekMin = Math.min(...daily.map((d) => d.minC))
  const weekMax = Math.max(...daily.map((d) => d.maxC))
  const span = Math.max(1, weekMax - weekMin)

  return (
    <section aria-labelledby="forecast-heading" className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h3 id="forecast-heading" className="text-lg font-semibold tracking-[-0.03em] text-white">
          5-day forecast
        </h3>
        <span className="text-xs text-[#6f6f6f]">Low to high, per day</span>
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
              aria-label={`${weekday}, ${day.description}, high ${Math.round(day.maxC)} degrees, low ${Math.round(day.minC)} degrees`}
              style={{ animationDelay: `${idx * 70}ms` }}
              className={`animate-rise grid grid-cols-[60px_44px_minmax(0,1fr)] items-center gap-x-3 rounded-2xl border px-3 py-2.5 sm:grid-cols-[84px_48px_130px_minmax(0,1fr)] sm:gap-x-4 sm:px-5 ${
                idx === 0
                  ? 'border-white/[0.16] bg-white/[0.06]'
                  : 'border-white/[0.07] bg-white/[0.025] transition-colors hover:bg-white/[0.05]'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{weekday}</p>
                <p className="text-[11px] text-[#707070]">{dateLabel}</p>
              </div>

              <WeatherIcon condition={day.condition} className="h-9 w-9 sm:h-10 sm:w-10" />

              <p
                className="hidden truncate text-sm capitalize text-[#9a9a9a] sm:block"
                title={day.description}
              >
                {day.description}
              </p>

              <div className="flex items-center gap-2.5">
                <span className="w-8 text-right text-sm tabular-nums text-[#8d8d8d]">
                  {Math.round(day.minC)}°
                </span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="animate-barGrow absolute inset-y-0 rounded-full bg-gradient-to-r from-[#c9d0d6] via-[#f2d79a] to-[#ff9d3c]"
                    style={{
                      left: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                      animationDelay: `${180 + idx * 70}ms`,
                    }}
                  />
                </div>
                <span className="w-8 text-sm font-semibold tabular-nums text-white">
                  {Math.round(day.maxC)}°
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}