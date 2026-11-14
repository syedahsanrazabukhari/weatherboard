/**
 * Unit helpers. The app stores everything in metric (Celsius, m/s) and only
 * converts for display, so switching units never needs a refetch.
 */
export type Unit = 'c' | 'f'

export const UNIT_STORAGE_KEY = 'weatherboard:unit:v1'

export function isUnit(value: unknown): value is Unit {
  return value === 'c' || value === 'f'
}

export function convertTemp(celsius: number, unit: Unit): number {
  return unit === 'f' ? (celsius * 9) / 5 + 32 : celsius
}

/** Rounded temperature number for the chosen unit (no symbol). */
export function tempValue(celsius: number, unit: Unit): number {
  const rounded = Math.round(convertTemp(celsius, unit))
  return rounded === 0 ? 0 : rounded // avoids "-0"
}

export function unitSymbol(unit: Unit): string {
  return unit === 'f' ? '°F' : '°C'
}

/** e.g. "27°C" or "81°F". */
export function formatTemp(celsius: number, unit: Unit): string {
  return `${tempValue(celsius, unit)}${unitSymbol(unit)}`
}

/** Wind speed from m/s: km/h for metric, mph for imperial. */
export function windValue(metersPerSecond: number, unit: Unit): number {
  return Math.round(unit === 'f' ? metersPerSecond * 2.236936 : metersPerSecond * 3.6)
}

export function windUnitLabel(unit: Unit): string {
  return unit === 'f' ? 'mph' : 'km/h'
}