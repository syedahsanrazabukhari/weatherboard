import { WeatherCondition } from '../types'

/**
 * Soft ambient glow colour (r,g,b,a) used behind the dashboard.
 * Stays warm / neutral on purpose so the theme remains black, not blue.
 */
export function ambientGlow(condition: WeatherCondition, isNight: boolean): string {
  switch (condition) {
    case 'clear':
      return isNight ? 'rgba(176, 164, 214, 0.13)' : 'rgba(255, 170, 60, 0.20)'
    case 'partly-cloudy':
      return isNight ? 'rgba(170, 160, 205, 0.12)' : 'rgba(240, 190, 100, 0.16)'
    case 'cloudy':
      return 'rgba(175, 180, 190, 0.12)'
    case 'fog':
      return 'rgba(165, 165, 165, 0.11)'
    case 'drizzle':
    case 'rain':
      return 'rgba(130, 155, 175, 0.14)'
    case 'thunderstorm':
      return 'rgba(220, 175, 70, 0.16)'
    case 'snow':
      return 'rgba(205, 215, 225, 0.13)'
    default:
      return 'rgba(175, 180, 190, 0.12)'
  }
}