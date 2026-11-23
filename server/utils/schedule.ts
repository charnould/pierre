import { z } from 'zod'

import type {
  IntakeNotificationSchedule,
  Month,
  RecurrenceSchedule,
  Weekday
} from '../../shared/schedule'
import { type ZonedDateParts, zonedDateParts } from '../../shared/zoned-date'

const MinuteSchema = z.number().int().min(0).max(59)
const HourSchema = z.number().int().min(0).max(23)
const DayOfMonthSchema = z.number().int().min(1).max(28)

const WeekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7)
])

const MonthSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12)
])

const UniqueWeekdaysSchema = z
  .array(WeekdaySchema)
  .min(1)
  .refine((values) => new Set(values).size === values.length, {
    message: 'Les jours doivent être uniques'
  })
  .transform((values): Weekday[] => [...values].sort((a, b) => a - b))

const UniqueMonthsSchema = z
  .array(MonthSchema)
  .min(1)
  .refine((values) => new Set(values).size === values.length, {
    message: 'Les mois doivent être uniques'
  })
  .transform((values): Month[] => [...values].sort((a, b) => a - b))

const HourlyScheduleSchema = z
  .object({
    frequency: z.literal('hourly'),
    minute: MinuteSchema
  })
  .strict()

const DailyScheduleSchema = z
  .object({
    frequency: z.literal('daily'),
    hour: HourSchema,
    minute: MinuteSchema
  })
  .strict()

const WeeklyScheduleSchema = z
  .object({
    frequency: z.literal('weekly'),
    days: UniqueWeekdaysSchema,
    hour: HourSchema,
    minute: MinuteSchema
  })
  .strict()

const MonthlyScheduleSchema = z
  .object({
    frequency: z.literal('monthly'),
    dayOfMonth: DayOfMonthSchema,
    hour: HourSchema,
    minute: MinuteSchema
  })
  .strict()

const MonthsScheduleSchema = z
  .object({
    frequency: z.literal('months'),
    months: UniqueMonthsSchema,
    dayOfMonth: DayOfMonthSchema,
    hour: HourSchema,
    minute: MinuteSchema
  })
  .strict()

const RECURRENCE_VARIANTS = [
  HourlyScheduleSchema,
  DailyScheduleSchema,
  WeeklyScheduleSchema,
  MonthlyScheduleSchema,
  MonthsScheduleSchema
] as const

export const RecurrenceScheduleSchema: z.ZodType<RecurrenceSchedule> = z.discriminatedUnion(
  'frequency',
  [...RECURRENCE_VARIANTS]
)

export const IntakeNotificationScheduleSchema: z.ZodType<IntakeNotificationSchedule> =
  z.discriminatedUnion('frequency', [
    z.object({ frequency: z.literal('none') }).strict(),
    z.object({ frequency: z.literal('immediate') }).strict(),
    ...RECURRENCE_VARIANTS
  ])

const MINUTE_MS = 60_000
const PROBE_MS = 18 * 3_600_000

/** Strict next UTC minute boundary after `now`, preventing same-minute re-triggers. */
export function nextMinuteBoundary(now: Date): Date {
  return new Date((Math.floor(now.getTime() / MINUTE_MS) + 1) * MINUTE_MS)
}

function wallMs(parts: ZonedDateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

function resolveLocalWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): number[] {
  const utcWall = Date.UTC(year, month - 1, day, hour, minute)
  const offsetAt = (ts: number) => wallMs(zonedDateParts(new Date(ts), timeZone)) - ts
  const t1 = utcWall - offsetAt(utcWall - PROBE_MS)
  const t2 = utcWall - offsetAt(utcWall + PROBE_MS)
  const candidates = t1 === t2 ? [t1] : [t1, t2]

  const resolved: number[] = []
  for (const ts of candidates) {
    const parts = zonedDateParts(new Date(ts), timeZone)
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute &&
      parts.second === 0
    ) {
      resolved.push(ts)
    }
  }
  return resolved.sort((a, b) => a - b)
}

function firstAtOrAfter(instants: readonly number[], afterMs: number): string | null {
  for (const ts of instants) {
    if (ts >= afterMs) return new Date(ts).toISOString()
  }
  return null
}

/**
 * Next occurrence instant (UTC ISO) at or after `after`, in `timeZone` wall-clock.
 * DST-safe: nonexistent spring-forward wall times are skipped; ambiguous fall-back
 * wall times yield both instants in chronological order.
 */
export function computeNextOccurrence(
  schedule: RecurrenceSchedule,
  timeZone: string,
  after: Date = new Date()
): string {
  const afterMs = after.getTime()

  if (schedule.frequency === 'hourly') {
    let ts = Math.ceil(afterMs / MINUTE_MS) * MINUTE_MS
    for (let i = 0; i < 120; i++) {
      if (zonedDateParts(new Date(ts), timeZone).minute === schedule.minute) {
        return new Date(ts).toISOString()
      }
      ts += MINUTE_MS
    }
    throw new Error(`No next hourly occurrence found for minute=${schedule.minute} tz=${timeZone}`)
  }

  const local = zonedDateParts(after, timeZone)

  if (schedule.frequency === 'daily') {
    for (let offset = 0; offset < 3; offset++) {
      const probe = new Date(Date.UTC(local.year, local.month - 1, local.day + offset))
      const hit = firstAtOrAfter(
        resolveLocalWallClock(
          probe.getUTCFullYear(),
          probe.getUTCMonth() + 1,
          probe.getUTCDate(),
          schedule.hour,
          schedule.minute,
          timeZone
        ),
        afterMs
      )
      if (hit) return hit
    }
    throw new Error(`No next daily occurrence found for tz=${timeZone}`)
  }

  if (schedule.frequency === 'weekly') {
    for (let offset = 0; offset < 14; offset++) {
      const probe = new Date(Date.UTC(local.year, local.month - 1, local.day + offset))
      const utcDay = probe.getUTCDay()
      const isoWeekday = (utcDay === 0 ? 7 : utcDay) as Weekday
      if (!schedule.days.includes(isoWeekday)) continue
      const hit = firstAtOrAfter(
        resolveLocalWallClock(
          probe.getUTCFullYear(),
          probe.getUTCMonth() + 1,
          probe.getUTCDate(),
          schedule.hour,
          schedule.minute,
          timeZone
        ),
        afterMs
      )
      if (hit) return hit
    }
    throw new Error(`No next weekly occurrence found for tz=${timeZone}`)
  }

  if (schedule.frequency === 'monthly') {
    for (let offset = 0; offset < 3; offset++) {
      const probe = new Date(Date.UTC(local.year, local.month - 1 + offset, 1))
      const hit = firstAtOrAfter(
        resolveLocalWallClock(
          probe.getUTCFullYear(),
          probe.getUTCMonth() + 1,
          schedule.dayOfMonth,
          schedule.hour,
          schedule.minute,
          timeZone
        ),
        afterMs
      )
      if (hit) return hit
    }
    throw new Error(`No next monthly occurrence found for tz=${timeZone}`)
  }

  for (let offset = 0; offset < 36; offset++) {
    const probe = new Date(Date.UTC(local.year, local.month - 1 + offset, 1))
    const month = (probe.getUTCMonth() + 1) as Month
    if (!schedule.months.includes(month)) continue
    const hit = firstAtOrAfter(
      resolveLocalWallClock(
        probe.getUTCFullYear(),
        month,
        schedule.dayOfMonth,
        schedule.hour,
        schedule.minute,
        timeZone
      ),
      afterMs
    )
    if (hit) return hit
  }
  throw new Error(`No next months occurrence found for tz=${timeZone}`)
}
