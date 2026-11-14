import { describe, expect, it } from 'vitest'
import { convertTemp, formatTemp, isUnit, tempValue, windUnitLabel, windValue } from './units'

describe('units', () => {
  it('converts Celsius to Fahrenheit correctly', () => {
    expect(convertTemp(0, 'f')).toBe(32)
    expect(convertTemp(100, 'f')).toBe(212)
    expect(convertTemp(-40, 'f')).toBe(-40)
    expect(convertTemp(27, 'c')).toBe(27)
  })

  it('rounds for display and never shows negative zero', () => {
    expect(tempValue(26.6, 'c')).toBe(27)
    expect(tempValue(-0.2, 'c')).toBe(0)
    expect(Object.is(tempValue(-0.2, 'c'), -0)).toBe(false)
    expect(formatTemp(27, 'f')).toBe('81°F')
    expect(formatTemp(27, 'c')).toBe('27°C')
  })

  it('switches wind speed between km/h and mph', () => {
    expect(windValue(10, 'c')).toBe(36)
    expect(windValue(10, 'f')).toBe(22)
    expect(windUnitLabel('c')).toBe('km/h')
    expect(windUnitLabel('f')).toBe('mph')
  })

  it('validates stored unit values', () => {
    expect(isUnit('c')).toBe(true)
    expect(isUnit('f')).toBe(true)
    expect(isUnit('k')).toBe(false)
    expect(isUnit(null)).toBe(false)
  })
})