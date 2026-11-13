
import React from 'react'
import { WifiOff } from 'lucide-react'

interface OfflineBannerProps {
  isOnline: boolean
  cityName?: string
  lastUpdatedTime?: string
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  cityName,
  lastUpdatedTime,
}) => {
  if (isOnline) return null

  const message =
    cityName && lastUpdatedTime
      ? `You're offline. Showing saved weather for ${cityName}, last updated ${lastUpdatedTime}.`
      : "You're offline. Connect to the internet to load weather."

  return (
    <aside
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 border-b border-amber-500/20 bg-[#211b12] px-4 py-2.5 text-center text-xs font-medium text-amber-200"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>{message}</span>
      </div>
    </aside>
  )
}
