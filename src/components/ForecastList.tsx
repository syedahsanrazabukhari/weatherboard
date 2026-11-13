
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
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between border-b border-white/[0.08] pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#777]">
            The days ahead
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-white">
            5-day forecast
          </h3>
        </div>
        <span className="text-[11px] text-[#777]">Daily outlook</span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {daily.map((day, idx) => {
          const weekday = formatWeekday(day.date, idx)
          const dateLabel = formatDisplayDate(day.date)

          return (
            <article
              key={day.date}
              className={`flex min-w-0 flex-col items-center rounded-xl border p-2.5 text-center transition-colors sm:p-4 ${
                idx === 0
                  ? 'border-white/20 bg-[#202020]'
                  : 'border-white/[0.07] bg-[#121212] hover:border-white/15'
              }`}
            >
              <span className="text-[11px] font-semibold text-[#e8e8e8] sm:text-xs">
                {weekday}
              </span>
              <span className="mt-1 text-[9px] text-[#777] sm:text-[10px]">
                {dateLabel}
              </span>

              <div className="my-3 flex h-9 w-9 items-center justify-center sm:my-4 sm:h-11 sm:w-11">
                <WeatherIcon condition={day.condition} className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>

              <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                <span className="text-sm font-semibold tabular-nums text-white sm:text-base">
                  {Math.round(day.maxC)}°
                </span>
                <span className="text-xs tabular-nums text-[#777] sm:text-sm">
                  {Math.round(day.minC)}°
                </span>
              </div>

              <span
                className="mt-2 hidden max-w-full truncate text-[10px] capitalize text-[#777] sm:block"
                title={day.description}
              >
                {day.description}
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
