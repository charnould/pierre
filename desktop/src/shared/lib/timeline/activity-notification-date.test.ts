import { describe, expect, it } from 'bun:test'

import {
  formatActivityNotificationAbsolute,
  formatActivityNotificationDateline,
  formatActivityNotificationRelative,
  formatActivityNotificationTime,
  formatInspectorTimelineDateline
} from './activity-notification-date'

const now = new Date(2026, 7, 7, 15, 30, 0) // 7 Aug 2026 15:30 local

function isoAt(offsetMs: number): string {
  return new Date(now.getTime() + offsetMs).toISOString()
}

describe('formatActivityNotificationAbsolute', () => {
  it('formats day and clock with à', () => {
    const date = new Date(2026, 7, 17, 19, 8, 0)
    expect(formatActivityNotificationAbsolute(date.toISOString())).toBe('17/08/2026 à 19h08')
  })
})

describe('formatActivityNotificationDateline', () => {
  it('pads the hour and joins clock · day', () => {
    const date = new Date(2026, 7, 17, 9, 8, 0)
    expect(formatActivityNotificationDateline(date.toISOString())).toBe('09h08 · 17/08/2026')
  })
})

describe('formatInspectorTimelineDateline', () => {
  it('joins day · padded clock', () => {
    const date = new Date(2026, 7, 17, 9, 8, 0)
    expect(formatInspectorTimelineDateline(date.toISOString())).toBe('17/08/2026 · 09h08')
  })
})

describe('formatActivityNotificationTime', () => {
  it('pads the timeline hour', () => {
    const date = new Date(2026, 7, 17, 7, 4, 0)
    expect(formatActivityNotificationTime(date.toISOString())).toBe('07h04')
  })
})

describe('formatActivityNotificationRelative', () => {
  it('uses instant / minutes / hours for today', () => {
    expect(formatActivityNotificationRelative(isoAt(-30_000), now)).toBe("à l'instant")
    expect(formatActivityNotificationRelative(isoAt(-5 * 60_000), now)).toBe('il y a 5 min')
    expect(formatActivityNotificationRelative(isoAt(-3 * 60 * 60_000), now)).toBe('il y a 3 h')
  })

  it('uses hier with clock for yesterday', () => {
    const yesterday = new Date(2026, 7, 6, 9, 5, 0)
    expect(formatActivityNotificationRelative(yesterday.toISOString(), now)).toBe('hier · 9h05')
  })

  it('uses day count under 7 calendar days', () => {
    const threeDaysAgo = new Date(2026, 7, 4, 12, 0, 0)
    expect(formatActivityNotificationRelative(threeDaysAgo.toISOString(), now)).toBe(
      'il y a 3 jours'
    )
  })

  it('falls back to absolute from 7 calendar days', () => {
    const weekAgo = new Date(2026, 6, 31, 10, 15, 0)
    const iso = weekAgo.toISOString()
    expect(formatActivityNotificationRelative(iso, now)).toBe(
      formatActivityNotificationAbsolute(iso)
    )
  })
})
