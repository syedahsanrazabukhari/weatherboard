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
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
  } catch {
    return ''
  }
}

export const ForecastList: React.FC<ForecastListProps> = ({ daily }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        5-Day Forecast
      </h3>

      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:pb-0">
        {daily.map((day, idx) => {
          const weekday = formatWeekday(day.date, idx)
          const dateLabel = formatDisplayDate(day.date)

          return (
            <div
              key={day.date}
              className="flex min-w-[105px] flex-1 flex-col items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 backdrop-blur-xs transition-colors hover:border-slate-700/80 sm:min-w-0 sm:p-4"
            >
              <div className="text-center">
                <span className="block text-xs font-semibold text-slate-200">
                  {weekday}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {dateLabel}
                </span>
              </div>

              <div className="my-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/50">
                <WeatherIcon condition={day.condition} className="h-6 w-6" />
              </div>

              <div className="w-full text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-100">
                    {Math.round(day.maxC)}°
                  </span>
                  <span className="text-slate-400">
                    {Math.round(day.minC)}°
                  </span>
                </div>
                <span className="mt-1 block truncate text-[10px] text-slate-400" title={day.description}>
                  {day.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
