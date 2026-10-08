import { describe, expect, it } from 'bun:test'

import {
  formatActivityNotificationDateline,
  formatActivityNotificationTime,
  formatInspectorTimelineDateline
} from './activity-notification-date'

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
