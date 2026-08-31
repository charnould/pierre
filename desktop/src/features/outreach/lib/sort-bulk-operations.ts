import { lastBulkOperationEdit, type BulkOperationSummary } from '@/shared/types/bulk-operations'

export type BulkOperationSortKey =
  | 'modified_desc'
  | 'modified_asc'
  | 'last_run_desc'
  | 'last_run_asc'
  | 'name_asc'

export const BULK_OPERATION_SORT_OPTIONS: { value: BulkOperationSortKey; label: string }[] = [
  { value: 'modified_desc', label: 'Modification (récent)' },
  { value: 'modified_asc', label: 'Modification (ancien)' },
  { value: 'last_run_desc', label: 'Dernier run (récent)' },
  { value: 'last_run_asc', label: 'Dernier run (ancien)' },
  { value: 'name_asc', label: 'Nom (A→Z)' }
]

export const DEFAULT_BULK_OPERATION_SORT: BulkOperationSortKey = 'modified_desc'

function compareLocale(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' })
}

function timeOrFallback(iso: string | null | undefined, fallback: number): number {
  if (!iso) return fallback
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : fallback
}

export function matchesBulkOperationSearch(row: BulkOperationSummary, query: string): boolean {
  const last = lastBulkOperationEdit(row.edits)
  const haystack = [row.name, row.description, last?.by ?? ''].join(' ').toLowerCase()
  return haystack.includes(query)
}

export function sortBulkOperations(
  rows: BulkOperationSummary[],
  sortKey: BulkOperationSortKey
): BulkOperationSummary[] {
  return [...rows].sort((a, b) => {
    switch (sortKey) {
      case 'modified_desc': {
        const diff =
          timeOrFallback(lastBulkOperationEdit(b.edits)?.at, Number.NEGATIVE_INFINITY) -
          timeOrFallback(lastBulkOperationEdit(a.edits)?.at, Number.NEGATIVE_INFINITY)
        return diff !== 0 ? diff : compareLocale(a.name, b.name)
      }
      case 'modified_asc': {
        const diff =
          timeOrFallback(lastBulkOperationEdit(a.edits)?.at, Number.POSITIVE_INFINITY) -
          timeOrFallback(lastBulkOperationEdit(b.edits)?.at, Number.POSITIVE_INFINITY)
        return diff !== 0 ? diff : compareLocale(a.name, b.name)
      }
      case 'last_run_desc': {
        const diff =
          timeOrFallback(b.lastRunAt, Number.NEGATIVE_INFINITY) -
          timeOrFallback(a.lastRunAt, Number.NEGATIVE_INFINITY)
        return diff !== 0 ? diff : compareLocale(a.name, b.name)
      }
      case 'last_run_asc': {
        const diff =
          timeOrFallback(a.lastRunAt, Number.POSITIVE_INFINITY) -
          timeOrFallback(b.lastRunAt, Number.POSITIVE_INFINITY)
        return diff !== 0 ? diff : compareLocale(a.name, b.name)
      }
      case 'name_asc':
        return compareLocale(a.name, b.name)
      default:
        return 0
    }
  })
}
