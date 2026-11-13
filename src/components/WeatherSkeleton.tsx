import React from 'react'

const SkeletonBlock: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-shimmer rounded-lg ${className}`} />
)

export const WeatherSkeleton: React.FC = () => {
  return (
    <div className="space-y-7" aria-live="polite" aria-busy="true">
      <div className="rounded-3xl border border-white/[0.08] bg-[#0b0b0b]/80 p-5 sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="h-3.5 w-28" />
          </div>
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>

        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <SkeletonBlock className="h-[168px] w-[168px] shrink-0 rounded-full sm:h-[200px] sm:w-[200px]" />
          <div className="space-y-3">
            <SkeletonBlock className="h-20 w-40 sm:h-28 sm:w-56" />
            <SkeletonBlock className="mx-auto h-5 w-32 sm:mx-0" />
          </div>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-5 min-[420px]:grid-cols-3">
          <SkeletonBlock className="h-[68px] rounded-2xl" />
          <SkeletonBlock className="h-[68px] rounded-2xl" />
          <SkeletonBlock className="h-[68px] rounded-2xl" />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-36" />
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="flex h-[62px] items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4"
          >
            <SkeletonBlock className="h-8 w-14" />
            <SkeletonBlock className="h-9 w-9 rounded-full" />
            <SkeletonBlock className="h-2 flex-1 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}