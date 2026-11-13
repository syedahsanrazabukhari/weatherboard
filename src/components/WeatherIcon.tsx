
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
        <Moon className={`${className} text-[#c5c0d2]`} size={size} aria-hidden="true" />
      ) : (
        <Sun className={`${className} text-[#e4bd72]`} size={size} aria-hidden="true" />
      )

    case 'partly-cloudy':
      return isNight ? (
        <CloudMoon className={`${className} text-[#c5c0d2]`} size={size} aria-hidden="true" />
      ) : (
        <CloudSun className={`${className} text-[#d8b978]`} size={size} aria-hidden="true" />
      )

    case 'cloudy':
      return <Cloud className={`${className} text-[#b8b8b8]`} size={size} aria-hidden="true" />

    case 'fog':
      return <CloudFog className={`${className} text-[#999]`} size={size} aria-hidden="true" />

    case 'drizzle':
      return <CloudDrizzle className={`${className} text-[#a9b9bb]`} size={size} aria-hidden="true" />

    case 'rain':
      return <CloudRain className={`${className} text-[#91aab5]`} size={size} aria-hidden="true" />

    case 'thunderstorm':
      return <CloudLightning className={`${className} text-[#d5b66f]`} size={size} aria-hidden="true" />

    case 'snow':
      return <CloudSnow className={`${className} text-[#c8d0d2]`} size={size} aria-hidden="true" />

    default:
      return <Cloud className={`${className} text-[#b8b8b8]`} size={size} aria-hidden="true" />
  }
}
