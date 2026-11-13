import React from 'react'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from 'lucide-react'
import { WeatherCondition } from '../types'

interface WeatherIconProps {
  condition: WeatherCondition
  isNight?: boolean
  className?: string
  size?: number
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  condition,
  isNight = false,
  className = 'h-6 w-6',
  size,
}) => {
  switch (condition) {
    case 'clear':
      return isNight ? (
        <Moon className={`${className} text-indigo-300`} size={size} aria-hidden="true" />
      ) : (
        <Sun className={`${className} text-amber-400`} size={size} aria-hidden="true" />
      )
    case 'partly-cloudy':
      return isNight ? (
        <CloudMoon className={`${className} text-indigo-200`} size={size} aria-hidden="true" />
      ) : (
        <CloudSun className={`${className} text-amber-300`} size={size} aria-hidden="true" />
      )
    case 'cloudy':
      return <Cloud className={`${className} text-slate-300`} size={size} aria-hidden="true" />
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} size={size} aria-hidden="true" />
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-cyan-300`} size={size} aria-hidden="true" />
    case 'rain':
      return <CloudRain className={`${className} text-blue-400`} size={size} aria-hidden="true" />
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-yellow-400`} size={size} aria-hidden="true" />
    case 'snow':
      return <CloudSnow className={`${className} text-sky-200`} size={size} aria-hidden="true" />
    default:
      return <Cloud className={`${className} text-slate-300`} size={size} aria-hidden="true" />
  }
}
