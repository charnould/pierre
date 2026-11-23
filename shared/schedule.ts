export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7 // ISO: 1 = lundi … 7 = dimanche
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type RecurrenceSchedule =
  | { frequency: 'hourly'; minute: number }
  | { frequency: 'daily'; hour: number; minute: number }
  | { frequency: 'weekly'; days: Weekday[]; hour: number; minute: number }
  | { frequency: 'monthly'; dayOfMonth: number; hour: number; minute: number }
  | { frequency: 'months'; months: Month[]; dayOfMonth: number; hour: number; minute: number }

export type IntakeNotificationSchedule =
  { frequency: 'none' } | { frequency: 'immediate' } | RecurrenceSchedule

export const WEEKDAYS: readonly { value: Weekday; shortLabel: string; label: string }[] = [
  { value: 1, shortLabel: 'Lu', label: 'lundi' },
  { value: 2, shortLabel: 'Ma', label: 'mardi' },
  { value: 3, shortLabel: 'Me', label: 'mercredi' },
  { value: 4, shortLabel: 'Je', label: 'jeudi' },
  { value: 5, shortLabel: 'Ve', label: 'vendredi' },
  { value: 6, shortLabel: 'Sa', label: 'samedi' },
  { value: 7, shortLabel: 'Di', label: 'dimanche' }
]

export const MONTHS: readonly { value: Month; shortLabel: string; label: string }[] = [
  { value: 1, shortLabel: 'Janv.', label: 'janvier' },
  { value: 2, shortLabel: 'Févr.', label: 'février' },
  { value: 3, shortLabel: 'Mars', label: 'mars' },
  { value: 4, shortLabel: 'Avr.', label: 'avril' },
  { value: 5, shortLabel: 'Mai', label: 'mai' },
  { value: 6, shortLabel: 'Juin', label: 'juin' },
  { value: 7, shortLabel: 'Juil.', label: 'juillet' },
  { value: 8, shortLabel: 'Août', label: 'août' },
  { value: 9, shortLabel: 'Sept.', label: 'septembre' },
  { value: 10, shortLabel: 'Oct.', label: 'octobre' },
  { value: 11, shortLabel: 'Nov.', label: 'novembre' },
  { value: 12, shortLabel: 'Déc.', label: 'décembre' }
]

export const DEFAULT_AUTOMATION_SCHEDULE: RecurrenceSchedule = {
  frequency: 'weekly',
  days: [1],
  hour: 8,
  minute: 0
}

export function isRecurrenceSchedule(
  value: IntakeNotificationSchedule
): value is RecurrenceSchedule {
  return value.frequency !== 'none' && value.frequency !== 'immediate'
}

export function switchScheduleFrequency(
  current: IntakeNotificationSchedule,
  next: RecurrenceSchedule['frequency']
): RecurrenceSchedule
export function switchScheduleFrequency(
  current: IntakeNotificationSchedule,
  next: IntakeNotificationSchedule['frequency']
): IntakeNotificationSchedule
export function switchScheduleFrequency(
  current: IntakeNotificationSchedule,
  next: IntakeNotificationSchedule['frequency']
): IntakeNotificationSchedule {
  if (next === 'none') return { frequency: 'none' }
  if (next === 'immediate') return { frequency: 'immediate' }

  const hour = 'hour' in current ? current.hour : 8
  const minute = 'minute' in current ? current.minute : 0
  const dayOfMonth = 'dayOfMonth' in current ? current.dayOfMonth : 1

  switch (next) {
    case 'hourly':
      return { frequency: 'hourly', minute }
    case 'daily':
      return { frequency: 'daily', hour, minute }
    case 'weekly':
      return {
        frequency: 'weekly',
        days: current.frequency === 'weekly' ? current.days : [1],
        hour,
        minute
      }
    case 'monthly':
      return { frequency: 'monthly', dayOfMonth, hour, minute }
    case 'months':
      return {
        frequency: 'months',
        months: current.frequency === 'months' ? current.months : [1],
        dayOfMonth,
        hour,
        minute
      }
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

function formatDayOfMonth(day: number): string {
  return day === 1 ? '1er' : String(day)
}

function joinFrenchList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

export function formatScheduleSummary(schedule: RecurrenceSchedule): string {
  switch (schedule.frequency) {
    case 'hourly':
      return `Toutes les heures à :${pad2(schedule.minute)}`
    case 'daily':
      return `Tous les jours à ${formatTime(schedule.hour, schedule.minute)}`
    case 'weekly': {
      const sorted = [...new Set(schedule.days)].sort((a, b) => a - b)
      const time = formatTime(schedule.hour, schedule.minute)
      if (sorted.length === WEEKDAYS.length) {
        return `Tous les jours à ${time}`
      }
      const labels = sorted.map((d) => `${WEEKDAYS[d - 1]!.label}s`)
      return `Les ${joinFrenchList(labels)} à ${time}`
    }
    case 'monthly':
      return `Le ${formatDayOfMonth(schedule.dayOfMonth)} de chaque mois à ${formatTime(schedule.hour, schedule.minute)}`
    case 'months': {
      const sorted = [...new Set(schedule.months)].sort((a, b) => a - b)
      const day = formatDayOfMonth(schedule.dayOfMonth)
      const time = formatTime(schedule.hour, schedule.minute)
      if (sorted.length === MONTHS.length) {
        return `Le ${day} de chaque mois à ${time}`
      }
      const labels =
        sorted.length === 1
          ? [MONTHS[sorted[0]! - 1]!.label]
          : sorted.map((m) => MONTHS[m - 1]!.shortLabel.toLowerCase())
      const list = joinFrenchList(labels)
      const preposition = /^[ao]/i.test(list) ? 'd’' : 'de '
      return `Le ${day} ${preposition}${list} à ${time}`
    }
  }
}
