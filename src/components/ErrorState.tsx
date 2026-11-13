
import React from 'react'
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'
import { WeatherError } from '../types'

interface ErrorStateProps {
  error: WeatherError
  onRetry: () => void
}

function getErrorMessageDetails(error: WeatherError): {
  title: string
  message: string
  isOffline: boolean
} {
  switch (error.kind) {
    case 'network':
      return {
        title: 'Connection Lost',
        message: 'You appear to be offline. Check your connection, then retry.',
        isOffline: true,
      }
    case 'rate_limit':
      return {
        title: 'Service Rate Limit',
        message: 'The weather service is busy right now. We tried a backup source too. Try again in a minute.',
        isOffline: false,
      }
    case 'server':
      return {
        title: 'Service Temporarily Unavailable',
        message: 'The weather service is experiencing high load or issues. We tried a backup source too. Try again in a minute.',
        isOffline: false,
      }
    case 'not_found':
      return {
        title: 'Location Not Found',
        message: 'No weather data found for this location.',
        isOffline: false,
      }
    case 'auth':
      return {
        title: 'Authorization Required',
        message: 'Weather service authorization failed. We tried a backup source too.',
        isOffline: false,
      }
    case 'timeout':
      return {
        title: 'Request Timed Out',
        message: 'The weather service is taking too long to respond. Check your connection and try again.',
        isOffline: false,
      }
    case 'unknown':
    default: {
      const details = error.message ? ` (${error.provider}: ${error.message})` : ''
      return {
        title: 'Unable to Load Weather',
        message: `An unexpected error occurred while loading weather data${details}. Please try again.`,
        isOffline: false,
      }
    }
  }
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  console.error('[ErrorState] Weather error encountered:', error)
  const { title, message, isOffline } = getErrorMessageDetails(error)

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/15 bg-[#111] p-7 text-center sm:p-10"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.07] text-rose-400">
        {isOffline ? <WifiOff className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#888]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-[#242424] px-5 py-2.5 text-xs font-semibold text-white transition hover:border-white/25 hover:bg-[#303030] focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  )
}
