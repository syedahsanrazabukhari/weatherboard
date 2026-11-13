import React from 'react'

export const WeatherSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-live="polite" aria-busy="true">
      {/* Current Weather Card Skeleton */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-7 backdrop-blur-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded-lg bg-slate-800" />
            <div className="h-4 w-28 rounded bg-slate-800/60" />
          </div>
          <div className="h-5 w-24 rounded-full bg-slate-800/60" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-800 sm:h-20 sm:w-20" />
            <div className="space-y-2">
              <div className="h-10 w-24 rounded-lg bg-slate-800 sm:h-12 sm:w-28" />
              <div className="h-4 w-32 rounded bg-slate-800/60" />
            </div>
          </div>
          <div className="h-8 w-28 rounded-xl bg-slate-800/40" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800/70 pt-5">
          <div className="h-14 rounded-xl bg-slate-800/40" />
          <div className="h-14 rounded-xl bg-slate-800/40" />
        </div>
      </div>

      {/* Forecast Section Skeleton */}
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-slate-800/60" />
        <div className="flex gap-2.5 overflow-hidden sm:grid sm:grid-cols-5 sm:gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex min-w-[105px] flex-1 flex-col items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 sm:min-w-0 sm:p-4 h-36"
            >
              <div className="h-3.5 w-12 rounded bg-slate-800" />
              <div className="h-9 w-9 rounded-xl bg-slate-800" />
              <div className="h-3.5 w-16 rounded bg-slate-800/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
