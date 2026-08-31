import type { BulkMedium, PreviewRow, PreviewStepReason } from '@/shared/types/bulk-operations'

export const MEDIUM_LABELS: Record<BulkMedium, string> = {
  rcs: 'RCS',
  sms: 'SMS',
  email: 'Courriel',
  courrier: 'Lettre postale simple',
  lrar: 'Lettre avec accusé de réception',
  lre: 'Lettre recommandée électronique (LRE)'
}

export const PREVIEW_STATUS_LABELS = {
  eligible: 'Éligible',
  no_usable_route: 'Sans route exploitable'
} as const

export function previewStepReasonLabel(reason: PreviewStepReason): string {
  switch (reason.code) {
    case 'missing_destination':
      return 'coordonnée absente'
    case 'unverified_contact':
      return 'coordonnée non vérifiée'
    case 'invalid_contact':
      return 'coordonnée invalide'
    case 'incompatible_contact':
      return `coordonnée incompatible (${reason.status})`
    case 'missing_content':
      return 'contenu absent'
    case 'missing_file':
      return 'fichier Word absent'
    case 'missing_placeholders':
      return `données manquantes : ${reason.placeholders.join(', ')}`
  }
}

export function previewChannelTotals(rows: PreviewRow[]): Partial<Record<BulkMedium, number>> {
  const totals: Partial<Record<BulkMedium, number>> = {}
  for (const row of rows) {
    const medium = row.route?.medium
    if (medium) totals[medium] = (totals[medium] ?? 0) + 1
  }
  return totals
}

export function formatPreviewChannelTotals(rows: PreviewRow[]): string {
  const totals = previewChannelTotals(rows)
  return Object.entries(totals)
    .map(([medium, total]) => `${MEDIUM_LABELS[medium as BulkMedium]} : ${total}`)
    .join(' · ')
}

export function formatBulkOperationDate(iso: string | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
