
import React from 'react'

const SkeletonBlock: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-shimmer rounded-lg ${className}`} />
)

export const WeatherSkeleton: React.FC = () => {
  return (
    <div className="space-y-7" aria-live="polite" aria-busy="true">
      <div className="rounded-2xl border border-white/[0.09] bg-[#111] p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="h-3.5 w-28" />
          </div>
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>

        <div className="mt-10 flex items-center gap-5 sm:gap-7">
          <SkeletonBlock className="h-[88px] w-[88px] shrink-0 rounded-2xl sm:h-28 sm:w-28" />
          <div className="space-y-3">
            <SkeletonBlock className="h-16 w-28 sm:h-20 sm:w-36" />
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-5">
          <SkeletonBlock className="h-[68px] rounded-xl" />
          <SkeletonBlock className="h-[68px] rounded-xl" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 border-b border-white/[0.08] pb-3">
          <SkeletonBlock className="h-2.5 w-24" />
          <SkeletonBlock className="h-5 w-36" />
        </div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex h-36 flex-col items-center justify-between rounded-xl border border-white/[0.07] bg-[#121212] p-3 sm:h-40 sm:p-4"
            >
              <SkeletonBlock className="h-3 w-12" />
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
              <SkeletonBlock className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
