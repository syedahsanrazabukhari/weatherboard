import { describe, expect, it } from 'vitest'
import { groupForecastByLocalDay } from './owmService'

describe('groupForecastByLocalDay', () => {
  // Generate 40 3-hourly entries starting from a given UTC timestamp
  function create40Entries(startUtcSeconds: number) {
    const list = []
    for (let i = 0; i < 40; i++) {
      list.push({
        dt: startUtcSeconds + i * 3 * 3600,
        main: {
          temp: 20 + (i % 5),
          temp_min: 15 + (i % 3),
          temp_max: 25 + (i % 3),
          humidity: 60,
        },
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d',
          },
        ],
        wind: {
          speed: 3.5,
        },
      })
    }
    return list
  }

  it('correctly groups 40 entries for a +9h (32400s) timezone offset (e.g. Tokyo)', () => {
    // Reference UTC: 2026-11-13 15:00:00 UTC
    // In UTC+9 (+32400s): 2026-11-14 00:00:00 local time
    const startUtc = 1794582000 // Fri, 13 Nov 2026 15:00:00 GMT
    const tzOffset = 32400 // +9 hours
    const currentTemp = 18.5

    const list = create40Entries(startUtc)
    const result = groupForecastByLocalDay(list, startUtc, currentTemp, tzOffset)

    expect(result).toHaveLength(5)
    // Local dates should be 5 consecutive days starting from 2026-11-14
    expect(result.map((d) => d.date)).toEqual([
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ])

    for (const day of result) {
      expect(typeof day.minC).toBe('number')
      expect(typeof day.maxC).toBe('number')
      expect(day.maxC).toBeGreaterThanOrEqual(day.minC)
      expect(day.condition).toBe('clear')
      expect(day.description).toBe('Clear sky')
    }
  })

  it('correctly groups 40 entries for a -5h (-18000s) timezone offset (e.g. New York)', () => {
    // Reference UTC: 2026-11-13 15:00:00 UTC
    // In UTC-5 (-18000s): 2026-11-13 10:00:00 local time
    const startUtc = 1794582000 // Fri, 13 Nov 2026 15:00:00 GMT
    const tzOffset = -18000 // -5 hours
    const currentTemp = 12.0

    const list = create40Entries(startUtc)
    const result = groupForecastByLocalDay(list, startUtc, currentTemp, tzOffset)

    expect(result).toHaveLength(5)
    // Local dates should be 5 consecutive days starting from 2026-11-13
    expect(result.map((d) => d.date)).toEqual([
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
    ])

    for (const day of result) {
      expect(typeof day.minC).toBe('number')
      expect(typeof day.maxC).toBe('number')
      expect(day.maxC).toBeGreaterThanOrEqual(day.minC)
      expect(day.condition).toBe('clear')
      expect(day.description).toBe('Clear sky')
    }
  })
})
