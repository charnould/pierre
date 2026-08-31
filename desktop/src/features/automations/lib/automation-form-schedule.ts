export const DAYS_OF_WEEK = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche'
] as const

const DAY_SHORT_LABELS: Record<(typeof DAYS_OF_WEEK)[number], string> = {
  lundi: 'Lu',
  mardi: 'Ma',
  mercredi: 'Me',
  jeudi: 'Je',
  vendredi: 'Ve',
  samedi: 'Sa',
  dimanche: 'Di'
}

const WEEKDAYS_ONLY = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

export function allDailyDays(): string[] {
  return [...DAYS_OF_WEEK]
}

export function weekdayDailyDays(): string[] {
  return [...WEEKDAYS_ONLY]
}

export const MONTHS_OF_YEAR = [
  { value: '1', label: 'janvier' },
  { value: '2', label: 'février' },
  { value: '3', label: 'mars' },
  { value: '4', label: 'avril' },
  { value: '5', label: 'mai' },
  { value: '6', label: 'juin' },
  { value: '7', label: 'juillet' },
  { value: '8', label: 'août' },
  { value: '9', label: 'septembre' },
  { value: '10', label: 'octobre' },
  { value: '11', label: 'novembre' },
  { value: '12', label: 'décembre' }
] as const

export function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function isWeekday(day: string | undefined): day is string {
  return !!day && (DAYS_OF_WEEK as readonly string[]).includes(day)
}

export function parseDailyDays(encoded: string | undefined): string[] {
  if (!encoded?.trim()) {
    return [...DAYS_OF_WEEK]
  }
  if (!encoded.includes(',')) {
    return isWeekday(encoded) ? [encoded] : [...DAYS_OF_WEEK]
  }
  const parts = new Set(encoded.split(',').map((part) => part.trim().toLowerCase()))
  const selected = DAYS_OF_WEEK.filter((day) => parts.has(day))
  return selected.length > 0 ? [...selected] : [...DAYS_OF_WEEK]
}

export function encodeDailyDays(days: readonly string[]): string {
  const selected = new Set(days)
  return DAYS_OF_WEEK.filter((day) => selected.has(day)).join(',')
}

export function formatDailyDaysLabel(encoded: string | undefined): string {
  const days = parseDailyDays(encoded)
  if (days.length === DAYS_OF_WEEK.length) {
    return 'Tous les jours'
  }
  if (days.length === WEEKDAYS_ONLY.length && WEEKDAYS_ONLY.every((day) => days.includes(day))) {
    return 'lun.–ven.'
  }
  return days.map((day) => DAY_SHORT_LABELS[day as (typeof DAYS_OF_WEEK)[number]] ?? day).join(', ')
}

function isMonthDay(day: string | undefined): day is string {
  if (!day || !/^\d+$/.test(day)) return false
  const n = Number(day)
  return n >= 1 && n <= 28
}

export function parseYearlyDay(encoded: string | undefined): { day: string; month: string } {
  if (encoded && /^\d{1,2}-\d{1,2}$/.test(encoded)) {
    const [day, month] = encoded.split('-')
    const d = Number(day)
    const m = Number(month)
    if (d >= 1 && d <= 28 && m >= 1 && m <= 12) {
      return { day: String(d), month: String(m) }
    }
  }
  return { day: '1', month: '1' }
}

export function encodeYearlyDay(day: string, month: string): string {
  return `${day}-${month}`
}

function isYearlyDay(day: string | undefined): day is string {
  if (!day || !/^\d{1,2}-\d{1,2}$/.test(day)) return false
  const { day: d, month: m } = parseYearlyDay(day)
  const monthNum = Number(m)
  return isMonthDay(d) && monthNum >= 1 && monthNum <= 12
}

export function defaultFrequencyDay(frequency: string): string | undefined {
  switch (frequency) {
    case 'daily':
      return encodeDailyDays(DAYS_OF_WEEK)
    case 'weekly':
      return 'lundi'
    case 'monthly':
      return '1'
    case 'yearly':
      return '1-1'
    default:
      return undefined
  }
}

export function normalizeFrequencyDay(
  frequency: string,
  day: string | undefined
): string | undefined {
  switch (frequency) {
    case 'daily':
      return encodeDailyDays(parseDailyDays(day))
    case 'weekly': {
      if (day?.includes(',')) {
        return parseDailyDays(day)[0] ?? 'lundi'
      }
      return isWeekday(day) ? day : 'lundi'
    }
    case 'monthly':
      return isMonthDay(day) ? day : '1'
    case 'yearly':
      return isYearlyDay(day) ? day : '1-1'
    default:
      return undefined
  }
}
