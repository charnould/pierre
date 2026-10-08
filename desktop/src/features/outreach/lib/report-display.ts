import { formatBulkOperationDate, MEDIUM_LABELS } from '@/features/outreach/lib/labels'
import type { TableCellDisplay } from '@/shared/components/table/TableCellValue'
import { COLUMN_VALUE_COLOR_GROUPS } from '@/shared/lib/ui-settings/column-value-palette'
import {
  columnValueStyleToBadge,
  resolveColumnValueBadgeDefaults
} from '@/shared/lib/ui-settings/tickets-table'
import type {
  BulkExecutionMode,
  BulkItemReportStatus,
  BulkReportItem,
  BulkReportSummary,
  BulkRunReportStatus
} from '@/shared/types/bulk-operations'

export const BULK_MODE_LABELS: Record<BulkExecutionMode, string> = {
  send: 'Avec envoi',
  apply_without_send: 'Sans envoi'
}

export const BULK_RUN_STATUS_LABELS: Record<BulkRunReportStatus, string> = {
  in_progress: 'En cours',
  ok: 'Réussi',
  ko: 'Échoué',
  partial: 'Partiel'
}

export const BULK_ITEM_STATUS_LABELS: Record<BulkItemReportStatus, string> = {
  in_progress: 'En cours',
  ok: 'Réussi',
  ko: 'Échoué'
}

const BADGE_DEFAULTS = resolveColumnValueBadgeDefaults()

const ITEM_STATUS_PALETTE: Record<BulkItemReportStatus, 'green' | 'red' | 'amber'> = {
  ok: 'green',
  ko: 'red',
  in_progress: 'amber'
}

function paletteStyle(familyId: string) {
  return COLUMN_VALUE_COLOR_GROUPS.find((group) => group.id === familyId)?.variants[0]
}

export function reportItemStatusDisplay(status: BulkItemReportStatus): TableCellDisplay {
  const style = paletteStyle(ITEM_STATUS_PALETTE[status])
  return {
    text: BULK_ITEM_STATUS_LABELS[status],
    badgeStyle: style ? columnValueStyleToBadge(style, BADGE_DEFAULTS) : undefined
  }
}

export function bulkReportRunMeta(report: BulkReportSummary): string[] {
  const parts = [
    report.actor,
    BULK_MODE_LABELS[report.mode],
    String(report.counts.total),
    `${report.counts.ok} réussi${report.counts.ok === 1 ? '' : 's'}`,
    `${report.counts.ko} échoué${report.counts.ko === 1 ? '' : 's'}`
  ]
  if (report.counts.inProgress > 0) {
    parts.push(`${report.counts.inProgress} en cours`)
  }
  return parts
}

export function formatBulkReportRunSummary(report: BulkReportSummary): string {
  return [formatBulkOperationDate(report.confirmedAt), ...bulkReportRunMeta(report)].join(' · ')
}

const OUTCOME_LABELS: Record<string, string> = {
  accepted: 'Accepté',
  applied: 'Appliqué',
  completed: 'Parcours terminé',
  delivered: 'Distribué',
  delivery_timeout: 'Livraison non confirmée',
  final_failure: 'Échec définitif',
  no_usable_route: 'Sans route exploitable',
  reply_timeout: 'Sans réponse dans le délai',
  send_failed: 'Envoi refusé'
}

export function reportItemChannel(item: BulkReportItem): string {
  if (item.mode === 'apply_without_send') return BULK_MODE_LABELS[item.mode]
  if (item.payload.kind === 'rich_rcs') return MEDIUM_LABELS.rcs
  const medium = item.payload.row.route?.medium
  if (medium && medium in MEDIUM_LABELS) return MEDIUM_LABELS[medium]
  return BULK_MODE_LABELS[item.mode]
}

export function reportItemOutcome(item: BulkReportItem): string {
  if (
    item.reportStatus === 'in_progress' &&
    item.payload.kind === 'rich_rcs' &&
    item.payload.stage === 'rich_wait_reply'
  ) {
    return 'En attente d’une réponse'
  }
  const code = item.outcome?.code
  if (typeof code !== 'string') return item.reportStatus === 'in_progress' ? 'En attente' : '—'
  return OUTCOME_LABELS[code] ?? code
}

export function reportItemDetail(item: BulkReportItem): string {
  if (item.lastError) return item.lastError
  if (item.payload.kind === 'rich_rcs') {
    const response = item.payload.responseHistory.at(-1)
    if (response) {
      const choice = response.label ?? response.postback
      if (choice) return `A choisi « ${choice} »`
    }
    return `Message ${item.payload.nodeId}`
  }
  const skipped = item.outcome && 'skippedSteps' in item.outcome ? item.outcome.skippedSteps : []
  if (skipped.length > 0) {
    return `${skipped.length} ${skipped.length === 1 ? 'canal écarté' : 'canaux écartés'}`
  }
  return item.attempts > 0 ? `${item.attempts} tentative${item.attempts === 1 ? '' : 's'}` : '—'
}
