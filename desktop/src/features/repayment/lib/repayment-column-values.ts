import { formatOrgCollaboratorLabel } from '@/shared/lib/org-users-cache'

import type { TenantRepaymentRow } from './classify-tenants'
import { formatDebtRentRatioMonths } from './format-repayment'
import { getRepaymentActionMeta } from './repayment-action'
import { getRepaymentBucketMeta, type RepaymentBucketId } from './repayment-bucket'
import type { TenantLastAction } from './repayment-last-action'

const COLORIZABLE_UI_COLUMN_IDS = ['derniere_action_realisee', 'bucket'] as const
const COLORIZABLE_LEDGER_COLUMN_IDS = new Set([
  'statut',
  'categorie',
  'gestionnaire',
  'ratio_dette_loyer'
])

export function isRepaymentColorizableColumn(columnId: string): boolean {
  if (COLORIZABLE_UI_COLUMN_IDS.includes(columnId as (typeof COLORIZABLE_UI_COLUMN_IDS)[number])) {
    return true
  }
  if (COLORIZABLE_LEDGER_COLUMN_IDS.has(columnId)) return true
  if (columnId.startsWith('id_')) return true
  return false
}

export function cellValueForColumn(
  columnId: string,
  row: TenantRepaymentRow,
  options?: {
    getBucket?: (row: TenantRepaymentRow) => RepaymentBucketId
    getLastAction?: (row: TenantRepaymentRow) => TenantLastAction | null
  }
): string {
  switch (columnId) {
    case 'bucket': {
      const bucket = options?.getBucket?.(row)
      return bucket ? getRepaymentBucketMeta(bucket).label : ''
    }
    case 'derniere_action_realisee': {
      const last = options?.getLastAction?.(row)
      return last ? getRepaymentActionMeta(last.action).label : ''
    }
    case 'ratio_dette_loyer': {
      const ratio = row.ratio_dette_loyer
      if (ratio == null || ratio <= 0) return ''
      return formatDebtRentRatioMonths(ratio)
    }
    case 'gestionnaire': {
      const value = row['gestionnaire']
      if (value == null || value === '') return ''
      return formatOrgCollaboratorLabel(String(value))
    }
    default: {
      const value = row[columnId]
      if (value == null || value === '') return ''
      return String(value)
    }
  }
}

export function collectDistinctColumnValues(
  columnId: string,
  rows: TenantRepaymentRow[],
  options?: {
    getBucket?: (row: TenantRepaymentRow) => RepaymentBucketId
    getLastAction?: (row: TenantRepaymentRow) => TenantLastAction | null
  }
): string[] {
  if (!isRepaymentColorizableColumn(columnId)) return []

  const seen = new Set<string>()
  const values: string[] = []
  for (const row of rows) {
    const value = cellValueForColumn(columnId, row, options)
    if (!value || seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }
  return values.sort((a, b) => a.localeCompare(b, 'fr'))
}
