import { describe, expect, it } from 'bun:test'

import {
  formatScheduleSummary,
  type IntakeNotificationSchedule,
  switchScheduleFrequency
} from '../../../../shared/schedule'
import {
  computeNextOccurrence,
  IntakeNotificationScheduleSchema,
  nextMinuteBoundary,
  RecurrenceScheduleSchema
} from '../../../utils/schedule'

describe('schedule Zod validation', () => {
  it('accepts all recurrence variants and sorts days and months ascending', () => {
    expect(RecurrenceScheduleSchema.parse({ frequency: 'hourly', minute: 15 })).toEqual({
      frequency: 'hourly',
      minute: 15
    })
    expect(RecurrenceScheduleSchema.parse({ frequency: 'daily', hour: 8, minute: 30 })).toEqual({
      frequency: 'daily',
      hour: 8,
      minute: 30
    })
    expect(
      RecurrenceScheduleSchema.parse({ frequency: 'weekly', days: [5, 1, 3], hour: 9, minute: 0 })
    ).toEqual({
      frequency: 'weekly',
      days: [1, 3, 5],
      hour: 9,
      minute: 0
    })
    expect(
      RecurrenceScheduleSchema.parse({ frequency: 'monthly', dayOfMonth: 28, hour: 7, minute: 45 })
    ).toEqual({
      frequency: 'monthly',
      dayOfMonth: 28,
      hour: 7,
      minute: 45
    })
    expect(
      RecurrenceScheduleSchema.parse({
        frequency: 'months',
        months: [12, 3, 9, 6],
        dayOfMonth: 15,
        hour: 9,
        minute: 0
      })
    ).toEqual({
      frequency: 'months',
      months: [3, 6, 9, 12],
      dayOfMonth: 15,
      hour: 9,
      minute: 0
    })
    expect(IntakeNotificationScheduleSchema.parse({ frequency: 'none' })).toEqual({
      frequency: 'none'
    })
    expect(IntakeNotificationScheduleSchema.parse({ frequency: 'immediate' })).toEqual({
      frequency: 'immediate'
    })
  })

  it('rejects duplicates, empty arrays, out-of-range values and extra properties', () => {
    const invalidInputs: unknown[] = [
      { frequency: 'hourly', minute: 60 },
      { frequency: 'hourly', minute: -1 },
      { frequency: 'hourly', minute: 15, hour: 8 },
      { frequency: 'daily', hour: 24, minute: 0 },
      { frequency: 'daily', hour: 8, minute: 60 },
      { frequency: 'weekly', days: [], hour: 8, minute: 0 },
      { frequency: 'weekly', days: [1, 1], hour: 8, minute: 0 },
      { frequency: 'weekly', days: [0], hour: 8, minute: 0 },
      { frequency: 'weekly', days: [8], hour: 8, minute: 0 },
      { frequency: 'monthly', dayOfMonth: 0, hour: 8, minute: 0 },
      { frequency: 'monthly', dayOfMonth: 29, hour: 8, minute: 0 },
      { frequency: 'months', months: [], dayOfMonth: 1, hour: 8, minute: 0 },
      { frequency: 'months', months: [3, 3], dayOfMonth: 1, hour: 8, minute: 0 },
      { frequency: 'months', months: [13], dayOfMonth: 1, hour: 8, minute: 0 },
      { frequency: 'none', extra: true },
      { frequency: 'immediate', minute: 0 }
    ]

    for (const input of invalidInputs) {
      expect(IntakeNotificationScheduleSchema.safeParse(input).success).toBe(false)
    }
    expect(RecurrenceScheduleSchema.safeParse({ frequency: 'immediate' }).success).toBe(false)
    expect(RecurrenceScheduleSchema.safeParse({ frequency: 'none' }).success).toBe(false)
  })
})

describe('computeNextOccurrence', () => {
  it('computes hourly slots including non-integer timezone offsets and exact vs +1ms boundaries', () => {
    // Europe/Paris (UTC+2 in July)
    expect(
      computeNextOccurrence(
        { frequency: 'hourly', minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T06:00:00.000Z')
      )
    ).toBe('2026-07-27T06:00:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'hourly', minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T06:00:00.001Z')
      )
    ).toBe('2026-07-27T07:00:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'hourly', minute: 15 },
        'Europe/Paris',
        new Date('2026-07-27T06:10:00.000Z')
      )
    ).toBe('2026-07-27T06:15:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'hourly', minute: 45 },
        'Europe/Paris',
        new Date('2026-07-27T06:46:00.000Z')
      )
    ).toBe('2026-07-27T07:45:00.000Z')

    // Asia/Kolkata (UTC+05:30): 06:00Z is 11:30 IST -> next :15 IST is 12:15 IST = 06:45Z
    expect(
      computeNextOccurrence(
        { frequency: 'hourly', minute: 15 },
        'Asia/Kolkata',
        new Date('2026-07-27T06:00:00.000Z')
      )
    ).toBe('2026-07-27T06:45:00.000Z')
  })

  it('computes daily slots on the same day or next day across timezones', () => {
    // 08:00 Paris in July = 06:00Z
    expect(
      computeNextOccurrence(
        { frequency: 'daily', hour: 8, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T05:30:00.000Z')
      )
    ).toBe('2026-07-27T06:00:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'daily', hour: 8, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T06:01:00.000Z')
      )
    ).toBe('2026-07-28T06:00:00.000Z')

    // 08:00 America/Martinique (UTC-4) = 12:00Z
    expect(
      computeNextOccurrence(
        { frequency: 'daily', hour: 8, minute: 0 },
        'America/Martinique',
        new Date('2026-07-27T11:00:00.000Z')
      )
    ).toBe('2026-07-27T12:00:00.000Z')
  })

  it('computes weekly slots for single day, multiple days and week rollover', () => {
    // 2026-07-27 is Monday (ISO 1)
    expect(
      computeNextOccurrence(
        { frequency: 'weekly', days: [1], hour: 8, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T06:00:00.000Z')
      )
    ).toBe('2026-07-27T06:00:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'weekly', days: [1], hour: 8, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T06:01:00.000Z')
      )
    ).toBe('2026-08-03T06:00:00.000Z')

    // Monday 08:01 Paris with [1, 3, 5] -> Wednesday 2026-07-29 08:00 Paris (06:00Z)
    expect(
      computeNextOccurrence(
        { frequency: 'weekly', days: [1, 3, 5], hour: 8, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-27T06:01:00.000Z')
      )
    ).toBe('2026-07-29T06:00:00.000Z')

    // Friday 2026-07-31 08:01 Paris with [1, 3, 5] -> Monday 2026-08-03 08:00 Paris
    expect(
      computeNextOccurrence(
        { frequency: 'weekly', days: [1, 3, 5], hour: 8, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-31T06:01:00.000Z')
      )
    ).toBe('2026-08-03T06:00:00.000Z')
  })

  it('computes monthly slots before/after dayOfMonth and across year rollover', () => {
    expect(
      computeNextOccurrence(
        { frequency: 'monthly', dayOfMonth: 15, hour: 9, minute: 0 },
        'Europe/Paris',
        new Date('2026-11-10T08:00:00.000Z')
      )
    ).toBe('2026-11-15T08:00:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'monthly', dayOfMonth: 15, hour: 9, minute: 0 },
        'Europe/Paris',
        new Date('2026-12-15T08:01:00.000Z')
      )
    ).toBe('2027-01-15T08:00:00.000Z')
  })

  it('computes months slots for quarterly, single-month and year rollover', () => {
    // Quarterly [3, 6, 9, 12] on the 15th at 09:00 Paris
    expect(
      computeNextOccurrence(
        { frequency: 'months', months: [3, 6, 9, 12], dayOfMonth: 15, hour: 9, minute: 0 },
        'Europe/Paris',
        new Date('2026-07-01T00:00:00.000Z')
      )
    ).toBe('2026-09-15T07:00:00.000Z') // September is CEST (UTC+2)

    // December only, after the slot -> next year December
    expect(
      computeNextOccurrence(
        { frequency: 'months', months: [12], dayOfMonth: 15, hour: 9, minute: 0 },
        'Europe/Paris',
        new Date('2026-12-15T08:01:00.000Z')
      )
    ).toBe('2027-12-15T08:00:00.000Z')
  })

  it('handles Europe/Paris DST spring-forward and fall-back transitions exactly', () => {
    // Spring-forward: 2026-03-29 02:30 does not exist in Europe/Paris -> skipped to 2026-03-30 02:30 CEST (00:30Z)
    expect(
      computeNextOccurrence(
        { frequency: 'daily', hour: 2, minute: 30 },
        'Europe/Paris',
        new Date('2026-03-29T00:00:00.000Z')
      )
    ).toBe('2026-03-30T00:30:00.000Z')

    // Fall-back: 2026-10-25 02:30 occurs twice (00:30Z CEST and 01:30Z CET)
    expect(
      computeNextOccurrence(
        { frequency: 'daily', hour: 2, minute: 30 },
        'Europe/Paris',
        new Date('2026-10-25T00:00:00.000Z')
      )
    ).toBe('2026-10-25T00:30:00.000Z')

    expect(
      computeNextOccurrence(
        { frequency: 'daily', hour: 2, minute: 30 },
        'Europe/Paris',
        new Date('2026-10-25T00:31:00.000Z')
      )
    ).toBe('2026-10-25T01:30:00.000Z')
  })
})

describe('nextMinuteBoundary & shared schedule helpers', () => {
  it('advances strictly to the next UTC minute boundary', () => {
    expect(nextMinuteBoundary(new Date('2026-07-27T06:00:00.000Z')).toISOString()).toBe(
      '2026-07-27T06:01:00.000Z'
    )
    expect(nextMinuteBoundary(new Date('2026-07-27T06:00:59.999Z')).toISOString()).toBe(
      '2026-07-27T06:01:00.000Z'
    )
  })

  it('switches frequency while preserving compatible fields', () => {
    const start: IntakeNotificationSchedule = {
      frequency: 'months',
      months: [3, 9],
      dayOfMonth: 15,
      hour: 10,
      minute: 45
    }
    expect(switchScheduleFrequency(start, 'monthly')).toEqual({
      frequency: 'monthly',
      dayOfMonth: 15,
      hour: 10,
      minute: 45
    })
    expect(switchScheduleFrequency(start, 'weekly')).toEqual({
      frequency: 'weekly',
      days: [1],
      hour: 10,
      minute: 45
    })
    expect(switchScheduleFrequency(start, 'hourly')).toEqual({
      frequency: 'hourly',
      minute: 45
    })
    expect(switchScheduleFrequency({ frequency: 'immediate' }, 'daily')).toEqual({
      frequency: 'daily',
      hour: 8,
      minute: 0
    })
    expect(switchScheduleFrequency(start, 'none')).toEqual({ frequency: 'none' })
  })

  it('formats readable French schedule summaries', () => {
    expect(formatScheduleSummary({ frequency: 'hourly', minute: 15 })).toBe(
      'Toutes les heures à :15'
    )
    expect(formatScheduleSummary({ frequency: 'daily', hour: 8, minute: 0 })).toBe(
      'Tous les jours à 08:00'
    )
    expect(formatScheduleSummary({ frequency: 'weekly', days: [1, 4], hour: 8, minute: 0 })).toBe(
      'Les lundis et jeudis à 08:00'
    )
    expect(formatScheduleSummary({ frequency: 'monthly', dayOfMonth: 1, hour: 8, minute: 0 })).toBe(
      'Le 1er de chaque mois à 08:00'
    )
    expect(
      formatScheduleSummary({
        frequency: 'months',
        months: [3, 6, 9, 12],
        dayOfMonth: 15,
        hour: 9,
        minute: 0
      })
    ).toBe('Le 15 de mars, juin, sept. et déc. à 09:00')
    expect(
      formatScheduleSummary({
        frequency: 'months',
        months: [4],
        dayOfMonth: 1,
        hour: 8,
        minute: 30
      })
    ).toBe('Le 1er d’avril à 08:30')
  })
})
