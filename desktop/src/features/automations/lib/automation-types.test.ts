import { describe, expect, test } from 'bun:test'

import {
  recordToAutomation,
  sameAutomationLogin
} from '@/features/automations/lib/automation-types'
import type { AutomationRecord } from '@/shared/types/automations'

type ReportAutomationRecord = AutomationRecord

function record(overrides: Partial<ReportAutomationRecord> = {}): ReportAutomationRecord {
  return {
    id: 'a1',
    type: 'report',
    name: 'Veille',
    description: '',
    status: 'scheduled',
    owner: 'admin@pierre.test',
    mentions: ['bob'],
    cron: '0 8 * * 1',
    nextRunAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    config: { prompt: '', maxReports: 6 },
    ...overrides
  }
}

describe('sameAutomationLogin', () => {
  test('matches the same canonical email case-insensitively', () => {
    expect(sameAutomationLogin('Admin@Pierre.test', 'admin@pierre.test')).toBe(true)
  })

  test('rejects local-part collisions across domains', () => {
    expect(sameAutomationLogin('admin@other.test', 'admin@pierre.test')).toBe(false)
    expect(sameAutomationLogin('admin2@pierre.test', 'admin@pierre.test')).toBe(false)
  })
})

describe('recordToAutomation', () => {
  test('treats only the canonical owner email as creator', () => {
    expect(recordToAutomation(record(), 'admin@pierre.test').isCreator).toBe(true)
    expect(recordToAutomation(record(), 'bob@pierre.test').isCreator).toBe(false)
  })
})
