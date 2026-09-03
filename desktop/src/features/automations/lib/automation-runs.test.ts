import { describe, expect, test } from 'bun:test'

import { buildAutomationRunEntries } from '@/features/automations/lib/automation-runs'
import { recordToAutomation } from '@/features/automations/lib/automation-types'
import type { Activite } from '@/shared/types/activites'
import type { AutomationRecord } from '@/shared/types/automations'

type ReportAutomationRecord = Extract<AutomationRecord, { type: 'report' }>

const REPORT_HTML = '<article class="report"><h1>Appels 2026</h1></article>'

function record(): ReportAutomationRecord {
  return {
    id: 'a1',
    type: 'report',
    name: 'Veille',
    description: '',
    status: 'scheduled',
    owner: 'admin@pierre.test',
    mentions: ['bob'],
    cron: '0 8 * * 1',
    next_run_at: null,
    last_run_at: null,
    last_run_status: null,
    config: { prompt: '', maxReports: 6 }
  }
}

function activity(contenu: Record<string, unknown>): Activite {
  return {
    id: 42,
    date_creation: '2026-06-10T14:00:00Z',
    rattachement: 'automations:a1',
    auteur: 'automation:a1',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'automation.reported',
    channel: null,
    mentions: [],
    contenu: JSON.stringify(contenu)
  }
}

describe('buildAutomationRunEntries', () => {
  test('reads v2 titled report HTML from note', () => {
    const automation = recordToAutomation(record(), 'admin@pierre.test')
    const [entry] = buildAutomationRunEntries(
      automation,
      [activity({ version: 2, title: 'Veille locative', note: REPORT_HTML })],
      6
    )

    expect(entry?.target).toMatchObject({
      kind: 'automation',
      activityId: 42,
      automationId: 'a1',
      title: 'Veille locative',
      content: REPORT_HTML
    })
  })

  test('does not invent HTML when the payload has no note', () => {
    const automation = recordToAutomation(record(), 'admin@pierre.test')
    const [entry] = buildAutomationRunEntries(
      automation,
      [activity({ version: 2, title: 'Veille locative' })],
      6
    )

    expect(entry?.target.title).toBe('Veille locative')
    expect(entry?.target.content).not.toMatch(/<article\b/i)
    expect(entry?.target.content).not.toBe(REPORT_HTML)
  })
})
