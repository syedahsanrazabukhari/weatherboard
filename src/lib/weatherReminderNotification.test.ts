import { describe, expect, it } from 'vitest'
import {
  formatReminderNotification,
  getMsUntilNextReminder,
  getTodayLocalDateString,
  isTimeAtOrAfter,
  ReminderWeatherData,
} from './weatherReminderNotification'

describe('weatherReminderNotification', () => {
  it('formats notification with weather data correctly', () => {
    const data: ReminderWeatherData = {
      tempC: 27.2,
      description: 'haze',
      highC: 29.4,
      lowC: 26.1,
    }
    const result = formatReminderNotification('Karachi', data)
    expect(result.title).toBe('Good morning!')
    expect(result.body).toBe('Karachi: 27°C, haze. High 29°, low 26°.')
  })

  it('formats fallback notification when weather data is null', () => {
    const result = formatReminderNotification('Karachi', null)
    expect(result.title).toBe('Karachi Weather Reminder')
    expect(result.body).toBe("Check today's weather for Karachi.")
  })

  it('correctly formats local date as YYYY-MM-DD', () => {
    const testDate = new Date(2026, 10, 14, 10, 30, 0) // Nov 14, 2026
    expect(getTodayLocalDateString(testDate)).toBe('2026-11-14')
  })

  it('checks isTimeAtOrAfter correctly', () => {
    const morning8 = new Date(2026, 10, 14, 8, 0, 0)
    const morning815 = new Date(2026, 10, 14, 8, 15, 0)
    const morning745 = new Date(2026, 10, 14, 7, 45, 0)

    expect(isTimeAtOrAfter('08:00', morning8)).toBe(true)
    expect(isTimeAtOrAfter('08:00', morning815)).toBe(true)
    expect(isTimeAtOrAfter('08:00', morning745)).toBe(false)
  })

  it('computes ms until next reminder accurately', () => {
    const now = new Date(2026, 10, 14, 7, 0, 0) // 07:00
    const ms = getMsUntilNextReminder('08:00', now)
    // 1 hour = 3,600,000 ms
    expect(ms).toBe(3_600_000)

    const pastNow = new Date(2026, 10, 14, 9, 0, 0) // 09:00 (past 08:00)
    const tomorrowMs = getMsUntilNextReminder('08:00', pastNow)
    // 23 hours = 23 * 3,600,000 ms = 82,800,000 ms
    expect(tomorrowMs).toBe(82_800_000)
  })
})

describe('formatReminderNotification units', () => {
  const data = { tempC: 27, description: 'haze', highC: 29, lowC: 26 }

  it('formats in Celsius by default', () => {
    expect(formatReminderNotification('Karachi', data).body).toBe(
      'Karachi: 27°C, haze. High 29°, low 26°.'
    )
  })

  it('formats in Fahrenheit when requested', () => {
    expect(formatReminderNotification('Karachi', data, 'f').body).toBe(
      'Karachi: 81°F, haze. High 84°, low 79°.'
    )
  })
})