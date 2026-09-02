import { describe, expect, it } from 'bun:test'

import {
  decodeCronToSchedule,
  encodeScheduleToCron,
  parseCronExpression
} from '../../../../../shared/automations'
import { compute_next_run_at } from '../../../../utils/automations/schedule'
import { CreateAutomationBodySchema } from '../../../../utils/automations/schemas'

describe('encodeScheduleToCron / decodeCronToSchedule', () => {
  it('rejects invalid days instead of silently defaulting them', () => {
    expect(
      CreateAutomationBodySchema.safeParse({
        type: 'report',
        name: 'Invalid',
        frequency: 'weekly',
        frequencyDay: 'funday',
        frequencyTime: '08:00',
        prompt: ''
      }).success
    ).toBe(false)
  })

  it('round-trips weekly monday 08:00', () => {
    const form = { frequency: 'weekly' as const, frequencyDay: 'lundi', frequencyTime: '08:00' }
    const cron = encodeScheduleToCron(form)
    expect(cron).toBe('0 8 * * 1')
    expect(decodeCronToSchedule(cron)).toEqual(form)
  })

  it('encodes daily weekdays', () => {
    const cron = encodeScheduleToCron({
      frequency: 'daily',
      frequencyDay: 'lundi,mardi,mercredi,jeudi,vendredi',
      frequencyTime: '09:30'
    })
    expect(cron).toBe('30 9 * * 1,2,3,4,5')
    expect(decodeCronToSchedule(cron).frequency).toBe('daily')
  })

  it('encodes daily all days as *', () => {
    expect(
      encodeScheduleToCron({
        frequency: 'daily',
        frequencyDay: 'lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
        frequencyTime: '08:00'
      })
    ).toBe('0 8 * * *')
  })

  it('encodes monthly and yearly', () => {
    expect(
      encodeScheduleToCron({ frequency: 'monthly', frequencyDay: '15', frequencyTime: '07:00' })
    ).toBe('0 7 15 * *')
    expect(
      encodeScheduleToCron({ frequency: 'yearly', frequencyDay: '1-1', frequencyTime: '06:00' })
    ).toBe('0 6 1 1 *')
  })

  it('parses dow ranges', () => {
    expect(parseCronExpression('0 8 * * 1-5').dows).toEqual([1, 2, 3, 4, 5])
  })
})

describe('compute_next_run_at', () => {
  it('returns the same minute when after is exactly on the slot', () => {
    // 2026-07-27 is a Monday
    const after = new Date('2026-07-27T06:00:00.000Z') // 08:00 Paris (UTC+2 in July)
    const next = compute_next_run_at('0 8 * * 1', 'Europe/Paris', after)
    expect(next).toBe('2026-07-27T06:00:00.000Z')
  })

  it('skips to next week when past the slot (catch-up)', () => {
    const after = new Date('2026-07-27T06:01:00.000Z') // just after Monday 08:00 Paris
    const next = compute_next_run_at('0 8 * * 1', 'Europe/Paris', after)
    expect(next).toBe('2026-08-03T06:00:00.000Z')
  })

  it('respects America/Martinique wall clock', () => {
    // 08:00 Martinique = 12:00 UTC
    const after = new Date('2026-07-27T11:00:00.000Z')
    const next = compute_next_run_at('0 8 * * *', 'America/Martinique', after)
    expect(next).toBe('2026-07-27T12:00:00.000Z')
  })
})
