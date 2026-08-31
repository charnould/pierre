import { describe, expect, test } from 'bun:test'

import {
  BULK_ITEM_STATUS_LABELS,
  BULK_MODE_LABELS,
  BULK_RUN_STATUS_LABELS,
  formatBulkReportRunSummary,
  reportItemChannel,
  reportItemDetail,
  reportItemOutcome,
  reportItemStatusDisplay
} from '@/features/outreach/lib/report-display'
import type { BulkReportItem, BulkReportSummary } from '@/shared/types/bulk-operations'

function item(overrides: Partial<BulkReportItem> = {}): BulkReportItem {
  return {
    id: 'job-1',
    executionId: 'run-1',
    itemId: 'LOC-1',
    source: 'comptes_locataires',
    mode: 'send',
    reportStatus: 'ok',
    outcome: { code: 'delivered' },
    currentActivityId: 42,
    completedAt: '2026-08-28T12:00:00Z',
    runAt: null,
    attempts: 1,
    lastError: null,
    payload: {
      row: {
        route: { kind: 'fallback', medium: 'email', stepIndex: 0 }
      }
    },
    ...overrides
  }
}

describe('affichage des rapports de traitements de masse', () => {
  test('distingue les modes et tous les statuts', () => {
    expect(BULK_MODE_LABELS).toEqual({
      send: 'Avec envoi',
      apply_without_send: 'Sans envoi'
    })
    expect(BULK_RUN_STATUS_LABELS).toEqual({
      in_progress: 'En cours',
      ok: 'Réussi',
      ko: 'Échoué',
      partial: 'Partiel'
    })
    expect(BULK_ITEM_STATUS_LABELS.ko).toBe('Échoué')
  })

  test('rend le canal, le résultat et le détail de chaque item', () => {
    expect(reportItemChannel(item())).toBe('Courriel')
    expect(reportItemOutcome(item())).toBe('Distribué')
    expect(reportItemDetail(item())).toBe('1 tentative')

    const failed = item({
      reportStatus: 'ko',
      outcome: { code: 'no_usable_route', skipped_steps: [{}, {}] },
      attempts: 2,
      lastError: 'Transport indisponible'
    })
    expect(reportItemOutcome(failed)).toBe('Sans route exploitable')
    expect(reportItemDetail(failed)).toBe('Transport indisponible')

    const withoutSend = item({ mode: 'apply_without_send', outcome: { code: 'applied' } })
    expect(reportItemChannel(withoutSend)).toBe('Sans envoi')
    expect(reportItemOutcome(withoutSend)).toBe('Appliqué')
  })

  test('colorise le statut unitaire et synthétise la rubrique d’un run', () => {
    const ok = reportItemStatusDisplay('ok')
    expect(ok.text).toBe('Réussi')
    expect(ok.badgeStyle?.background).toBeTruthy()
    expect(reportItemStatusDisplay('ko').text).toBe('Échoué')
    expect(reportItemStatusDisplay('in_progress').text).toBe('En cours')

    const report: BulkReportSummary = {
      bulkOperationId: 'bulk-1',
      executionId: 'run-1',
      source: 'comptes_locataires',
      mode: 'send',
      status: 'partial',
      counts: { total: 3, in_progress: 1, ok: 1, ko: 1 },
      confirmedAt: '2026-08-28T12:00:00Z',
      completedAt: null,
      actor: 'alice',
      result: {
        execution_id: 'run-1',
        totals: { total: 3, queued: 1, no_usable_route: 1, applied: 1 }
      }
    }
    expect(formatBulkReportRunSummary(report)).toContain('alice')
    expect(formatBulkReportRunSummary(report)).toContain('Avec envoi')
    expect(formatBulkReportRunSummary(report)).toContain('1 réussi')
    expect(formatBulkReportRunSummary(report)).toContain('1 échoué')
    expect(formatBulkReportRunSummary(report)).toContain('1 en cours')
  })
})
