import { describe, expect, test } from 'bun:test'

import {
  recordToAutomation,
  sameAutomationLogin
} from '@/features/automations/lib/automation-types'
import type { AutomationRecord } from '@/shared/types/automations'

type ReportAutomationRecord = Extract<AutomationRecord, { type: 'report' }>

function record(overrides: Partial<ReportAutomationRecord> = {}): ReportAutomationRecord {
  return {
    id: 'a1',
    type: 'report',
    name: 'Veille',
    description: '',
    status: 'scheduled',
    owner: 'admin',
    mentions: ['bob'],
    cron: '0 8 * * 1',
    next_run_at: null,
    last_run_at: null,
    last_run_status: null,
    config: { prompt: '', maxReports: 6 },
    ...overrides
  }
}

describe('sameAutomationLogin', () => {
  test('matches login to the same email local-part', () => {
    expect(sameAutomationLogin('admin', 'admin@pierre.test')).toBe(true)
    expect(sameAutomationLogin('admin@pierre.test', 'admin')).toBe(true)
    expect(sameAutomationLogin('Admin', 'admin@pierre.test')).toBe(true)
  })

  test('rejects a different person', () => {
    expect(sameAutomationLogin('admin', 'bob@pierre.test')).toBe(false)
    expect(sameAutomationLogin('admin', 'admin2@pierre.test')).toBe(false)
  })
})

describe('recordToAutomation', () => {
  test('treats the viewer email as owner when the local-part matches', () => {
    expect(recordToAutomation(record(), 'admin@pierre.test').isCreator).toBe(true)
    expect(recordToAutomation(record(), 'bob@pierre.test').isCreator).toBe(false)
  })
})
