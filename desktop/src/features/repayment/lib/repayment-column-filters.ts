import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import { formatFacetLabel } from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from './classify-tenants'
import {
  formatDebtRentRatioMonths,
  formatDaysSinceLastAction,
  formatEuro
} from './format-repayment'
import type { RepaymentBucketId } from './repayment-bucket'
import { cellValueForColumn, isRepaymentColorizableColumn } from './repayment-column-values'
import type { TenantLastAction } from './repayment-last-action'
import { daysSinceToday } from './repayment-timeline-days'

const NON_FILTERABLE_COLUMN_IDS = new Set(['evolution_solde', 'alertes'])

export function isRepaymentFilterableColumn(
  columnId: string,
  activeColumnIds?: readonly string[]
): boolean {
  if (NON_FILTERABLE_COLUMN_IDS.has(columnId)) return false
  if (activeColumnIds) return activeColumnIds.includes(columnId)
  return true
}

export type RepaymentColumnFilterGetters = {
  getBucket?: (row: TenantRepaymentRow) => RepaymentBucketId
  getLastAction?: (row: TenantRepaymentRow) => TenantLastAction | null
  snapshotDate?: string
}

export function formatRepaymentFacetLabel(columnId: string, value: string): string {
  if (columnId === 'date_derniere_action_realisee') {
    const days = Number(value)
    if (!Number.isFinite(days)) return value
    return formatDaysSinceLastAction(days)
  }
  return formatFacetLabel(value)
}

function filterValueForColumn(
  columnId: string,
  row: TenantRepaymentRow,
  getters?: RepaymentColumnFilterGetters
): string {
  switch (columnId) {
    case 'date_derniere_action_realisee': {
      const last = getters?.getLastAction?.(row)
      if (!last) return ''
      return String(daysSinceToday(last.date))
    }
    case 'solde_locataire':
      return formatEuro(row.solde_locataire)
    case 'ratio_dette_loyer': {
      const ratio = row.ratio_dette_loyer
      if (ratio == null || ratio <= 0) return ''
      return formatDebtRentRatioMonths(ratio)
    }
    default:
      return cellValueForColumn(columnId, row, getters)
  }
}

export function collectFilterFacets(
  columnId: string,
  rows: TenantRepaymentRow[],
  getters?: RepaymentColumnFilterGetters
): string[] {
  if (!isRepaymentFilterableColumn(columnId)) return []

  const seen = new Set<string>()
  const values: string[] = []
  for (const row of rows) {
    const value = filterValueForColumn(columnId, row, getters)
    if (seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }

  return values.sort((a, b) =>
    formatRepaymentFacetLabel(columnId, a).localeCompare(
      formatRepaymentFacetLabel(columnId, b),
      'fr'
    )
  )
}

export function filterRepaymentRows(
  rows: TenantRepaymentRow[],
  columnFilters: ColumnFilters,
  getters?: RepaymentColumnFilterGetters,
  activeColumnIds?: readonly string[]
): TenantRepaymentRow[] {
  const activeEntries = Object.entries(columnFilters).filter(([, values]) => values.length > 0)
  if (activeEntries.length === 0) return rows

  return rows.filter((row) =>
    activeEntries.every(([columnId, selected]) => {
      if (!isRepaymentFilterableColumn(columnId, activeColumnIds)) return true
      const value = filterValueForColumn(columnId, row, getters)
      return selected.includes(value)
    })
  )
}

export function sanitizeRepaymentColumnFilters(
  filters: ColumnFilters | undefined,
  activeColumnIds?: readonly string[]
): ColumnFilters {
  if (!filters) return {}
  const cleaned: ColumnFilters = {}
  for (const [key, values] of Object.entries(filters)) {
    if (!isRepaymentFilterableColumn(key, activeColumnIds)) continue
    const valid = values.filter((v): v is string => typeof v === 'string')
    if (valid.length > 0) cleaned[key] = valid
  }
  return cleaned
}

export { isRepaymentColorizableColumn }
