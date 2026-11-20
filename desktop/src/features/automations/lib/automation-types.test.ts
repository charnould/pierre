import { describe, expect, test } from 'bun:test'

import { recordToAutomation } from '@/features/automations/lib/automation-types'
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
    schedule: { frequency: 'weekly', days: [1], hour: 8, minute: 0 },
    nextRunAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    config: { prompt: '', maxReports: 6 },
    ...overrides
  }
}

describe('recordToAutomation', () => {
  test('grants management to the canonical owner email or administrators', () => {
    expect(recordToAutomation(record(), 'admin@pierre.test').canManage).toBe(true)
    expect(recordToAutomation(record(), 'bob@pierre.test').canManage).toBe(false)
    expect(recordToAutomation(record(), 'bob@pierre.test', true).canManage).toBe(true)
  })
})
