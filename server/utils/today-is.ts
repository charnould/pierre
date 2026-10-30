import { zonedDateParts } from '../../shared/zoned-date'
import { timezone } from './setup-store'

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

function civilKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function holidayName(year: number, month: number, day: number): string | null {
  if (month === 1 && day === 1) return "Jour de l'an"
  if (month === 5 && day === 1) return 'Fête du travail'
  if (month === 5 && day === 8) return 'Victoire 1945'
  if (month === 7 && day === 14) return 'Fête nationale'
  if (month === 8 && day === 15) return 'Assomption'
  if (month === 11 && day === 1) return 'Toussaint'
  if (month === 11 && day === 11) return 'Armistice 1918'
  if (month === 12 && day === 25) return 'Noël'

  const key = civilKey(year, month, day)
  const easter = easterSunday(year)
  const movable = [
    [1, 'Lundi de Pâques'],
    [39, 'Ascension'],
    [50, 'Lundi de Pentecôte']
  ] as const
  for (const [offset, name] of movable) {
    const date = addUtcDays(easter, offset)
    if (civilKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()) === key) {
      return name
    }
  }
  return null
}

function isoWeek(year: number, month: number, day: number): number {
  const thursday = new Date(Date.UTC(year, month - 1, day))
  const isoWeekday = thursday.getUTCDay() || 7
  thursday.setUTCDate(thursday.getUTCDate() + 4 - isoWeekday)
  const days = (thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86_400_000
  return Math.ceil((days + 1) / 7)
}

/**
 * English civil date, ISO week and time in `zone`.
 * National French public holidays (not regional ones) add their name.
 *
 * Example: "Monday, July 14, 2025 (Week 29) at 09:30 – today is a French public holiday (Fête nationale)"
 */
export const today_is = (now = new Date(), zone = timezone() ?? 'UTC'): string => {
  const parts = zonedDateParts(now, zone)
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  }).format(now)
  const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  const week = isoWeek(parts.year, parts.month, parts.day)
  const holiday = holidayName(parts.year, parts.month, parts.day)
  const suffix = holiday ? ` – today is a French public holiday (${holiday})` : ''
  return `${date} (Week ${week}) at ${time}${suffix}`
}
