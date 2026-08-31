import type {
  ColumnSizingState,
  OnChangeFn,
  SortingState,
  ColumnVisibilityState
} from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'

import {
  clearAllColumnFilters,
  hasActiveColumnFilters,
  parseColumnValues,
  type ColumnFilters,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

import type { RepaymentBucketId } from './repayment-bucket'
import { sanitizeRepaymentColumnFilters } from './repayment-column-filters'
import { sanitizeColumnSorting } from './repayment-column-sort'
import {
  defaultRepaymentColumnSizing,
  isRepaymentColumnId,
  isRepaymentUiColumnId,
  pinLockedRepaymentColumns,
  resolveRepaymentTableColumnIds,
  type RepaymentColumnId
} from './repayment-table-columns'

const STORAGE_KEY = 'pierre.repayment-table-prefs'

type TableLayoutPrefs = {
  columnOrder: RepaymentColumnId[]
  columnSizing: ColumnSizingState
  columnVisibility: ColumnVisibilityState
}

type BucketTablePrefs = {
  table?: Partial<TableLayoutPrefs>
  columnFilters?: ColumnFilters
  columnSorting?: SortingState
}

type StoredPrefsV8 = {
  version: 8
  columnValues?: ColumnValuesConfig
  buckets?: Partial<Record<RepaymentBucketId, BucketTablePrefs>>
}

export type ColumnValuesUpdater =
  | ColumnValuesConfig
  | ((prev: ColumnValuesConfig | undefined) => ColumnValuesConfig)

function sanitizeColumnValues(
  values: ColumnValuesConfig | undefined
): ColumnValuesConfig | undefined {
  return parseColumnValues(values)
}

function ledgerColumnIdsFromActive(activeColumnIds: readonly string[]): string[] {
  return activeColumnIds.filter((id) => !isRepaymentUiColumnId(id))
}

function sanitizeOrder(
  order: string[] | undefined,
  activeColumnIds: readonly string[]
): RepaymentColumnId[] {
  const ledgerIds = ledgerColumnIdsFromActive(activeColumnIds)
  const activeSet = new Set(activeColumnIds)
  if (!order?.length) return pinLockedRepaymentColumns(activeColumnIds, activeColumnIds)

  const valid = order.filter(
    (id): id is RepaymentColumnId => isRepaymentColumnId(id, ledgerIds) && activeSet.has(id)
  )
  const missing = activeColumnIds.filter((id) => !valid.includes(id))
  return pinLockedRepaymentColumns([...valid, ...missing], activeColumnIds)
}

function defaultColumnVisibility(ledgerColumnIds: readonly string[] = []): ColumnVisibilityState {
  const visibility: ColumnVisibilityState = {
    alertes: true,
    derniere_action_realisee: false,
    date_derniere_action_realisee: false
  }

  for (const id of ledgerColumnIds) {
    visibility[id] = true
  }

  return visibility
}

function sanitizeVisibility(
  visibility: ColumnVisibilityState | undefined,
  activeColumnIds: RepaymentColumnId[],
  ledgerColumnIds: readonly string[]
): ColumnVisibilityState {
  const defaults = defaultColumnVisibility(ledgerColumnIds)
  if (!visibility) return defaults

  const activeSet = new Set(activeColumnIds)
  const next: ColumnVisibilityState = { ...defaults }
  for (const id of activeColumnIds) {
    if (id in visibility) next[id] = visibility[id]
  }
  next.alertes = true
  for (const key of Object.keys(next)) {
    if (!activeSet.has(key as RepaymentColumnId)) delete next[key]
  }
  return next
}

function defaultTablePrefs(activeColumnIds: readonly string[]): TableLayoutPrefs {
  const ledgerIds = ledgerColumnIdsFromActive(activeColumnIds)
  return {
    columnOrder: sanitizeOrder(undefined, activeColumnIds),
    columnSizing: defaultRepaymentColumnSizing(ledgerIds),
    columnVisibility: defaultColumnVisibility(ledgerIds)
  }
}

function tablePrefsFromStored(
  stored: Partial<TableLayoutPrefs> | undefined,
  activeColumnIds: RepaymentColumnId[]
): TableLayoutPrefs {
  const ledgerIds = ledgerColumnIdsFromActive(activeColumnIds)
  const defaults = defaultTablePrefs(activeColumnIds)
  if (!stored) return defaults
  return {
    columnOrder: sanitizeOrder(stored.columnOrder, activeColumnIds),
    columnSizing: { ...defaults.columnSizing, ...stored.columnSizing },
    columnVisibility: sanitizeVisibility(stored.columnVisibility, activeColumnIds, ledgerIds)
  }
}

function emptyBucketPrefs(): BucketTablePrefs {
  return {}
}

function readStoredPrefs(): StoredPrefsV8 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 8 }

    const parsed = JSON.parse(raw) as StoredPrefsV8
    if (parsed.version !== 8) return { version: 8 }

    return {
      version: 8,
      columnValues: sanitizeColumnValues(parsed.columnValues),
      buckets: parsed.buckets
    }
  } catch {
    return { version: 8 }
  }
}

function writeStoredPrefs(prefs: StoredPrefsV8): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function readBucketPrefs(bucket: RepaymentBucketId): BucketTablePrefs {
  return readStoredPrefs().buckets?.[bucket] ?? emptyBucketPrefs()
}

function updateStoredColumnValues(
  columnValues: ColumnValuesConfig | undefined
): ColumnValuesConfig | undefined {
  const stored = readStoredPrefs()
  const sanitized = sanitizeColumnValues(columnValues) ?? columnValues
  const next: StoredPrefsV8 = {
    version: 8,
    ...(stored.buckets ? { buckets: stored.buckets } : {}),
    ...(sanitized ? { columnValues: sanitized } : {})
  }
  writeStoredPrefs(next)
  return sanitized
}

function updateBucketPrefs(bucket: RepaymentBucketId, patch: BucketTablePrefs): BucketTablePrefs {
  const stored = readStoredPrefs()
  const current = stored.buckets?.[bucket] ?? emptyBucketPrefs()
  const nextBucketPrefs: BucketTablePrefs = {
    ...current,
    ...patch
  }

  if (nextBucketPrefs.table && Object.keys(nextBucketPrefs.table).length === 0)
    delete nextBucketPrefs.table
  if (!hasActiveColumnFilters(nextBucketPrefs.columnFilters)) delete nextBucketPrefs.columnFilters
  if (!nextBucketPrefs.columnSorting?.length) delete nextBucketPrefs.columnSorting

  const buckets = { ...stored.buckets, [bucket]: nextBucketPrefs }
  if (Object.keys(nextBucketPrefs).length === 0) delete buckets[bucket]

  writeStoredPrefs({
    version: 8,
    ...(stored.columnValues ? { columnValues: stored.columnValues } : {}),
    ...(Object.keys(buckets).length ? { buckets } : {})
  })

  return nextBucketPrefs
}

function readTablePrefs(
  bucket: RepaymentBucketId,
  activeColumnIds: RepaymentColumnId[]
): TableLayoutPrefs {
  return tablePrefsFromStored(readBucketPrefs(bucket).table, activeColumnIds)
}

function updateTablePrefs(
  bucket: RepaymentBucketId,
  patch: Partial<TableLayoutPrefs>,
  activeColumnIds: RepaymentColumnId[]
): TableLayoutPrefs {
  const current = tablePrefsFromStored(readBucketPrefs(bucket).table, activeColumnIds)
  const next = { ...current, ...patch }
  updateBucketPrefs(bucket, { table: next })
  return next
}

export function resolveTablePrefs(
  stored: Partial<TableLayoutPrefs> | undefined,
  ledgerColumnIds: readonly string[] = []
): TableLayoutPrefs {
  const activeColumnIds = resolveRepaymentTableColumnIds(ledgerColumnIds)
  return tablePrefsFromStored(stored, activeColumnIds)
}

export function useRepaymentColumnValues() {
  const [columnValues, setColumnValuesState] = useState<ColumnValuesConfig | undefined>(() =>
    sanitizeColumnValues(readStoredPrefs().columnValues)
  )

  const setColumnValues = useCallback((updater: ColumnValuesUpdater) => {
    setColumnValuesState((prev) => {
      const nextValues = typeof updater === 'function' ? updater(prev) : updater
      const sanitized = sanitizeColumnValues(nextValues) ?? nextValues
      return updateStoredColumnValues(sanitized)
    })
  }, [])

  return { columnValues, setColumnValues }
}

export function useRepaymentTableFilters(bucket: RepaymentBucketId) {
  const [columnFilters, setColumnFiltersState] = useState<ColumnFilters>(
    () => readBucketPrefs(bucket).columnFilters ?? {}
  )
  const [columnSorting, setColumnSortingState] = useState<SortingState>(
    () => readBucketPrefs(bucket).columnSorting ?? []
  )
  const [seenBucket, setSeenBucket] = useState(bucket)
  if (bucket !== seenBucket) {
    setSeenBucket(bucket)
    const prefs = readBucketPrefs(bucket)
    setColumnFiltersState(prefs.columnFilters ?? {})
    setColumnSortingState(prefs.columnSorting ?? [])
  }

  const setColumnFilters = useCallback(
    (updater: ColumnFilters | ((prev: ColumnFilters) => ColumnFilters)) => {
      setColumnFiltersState((prev) => {
        const nextRaw = typeof updater === 'function' ? updater(prev) : updater
        const next = hasActiveColumnFilters(nextRaw)
          ? sanitizeRepaymentColumnFilters(nextRaw)
          : clearAllColumnFilters()
        updateBucketPrefs(bucket, {
          columnFilters: hasActiveColumnFilters(next) ? next : undefined
        })
        return next
      })
    },
    [bucket]
  )

  const setColumnSorting: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      setColumnSortingState((prev) => {
        const columnSorting = sanitizeColumnSorting(
          typeof updater === 'function' ? updater(prev) : updater
        )
        updateBucketPrefs(bucket, {
          columnSorting: columnSorting.length ? columnSorting : undefined
        })
        return columnSorting
      })
    },
    [bucket]
  )

  const clearColumnFilters = useCallback(() => {
    setColumnFilters(clearAllColumnFilters())
  }, [setColumnFilters])

  const clearColumnSorting = useCallback(() => {
    setColumnSorting([])
  }, [setColumnSorting])

  return {
    columnFilters,
    setColumnFilters,
    columnSorting,
    setColumnSorting,
    hasActiveColumnFilters: hasActiveColumnFilters(columnFilters),
    hasActiveColumnSorting: columnSorting.length > 0,
    clearColumnFilters,
    clearColumnSorting
  }
}

export function useRepaymentTablePreferences(
  ledgerColumnIds: readonly string[],
  bucket: RepaymentBucketId
) {
  const activeColumnIds = useMemo(
    () => resolveRepaymentTableColumnIds(ledgerColumnIds),
    [ledgerColumnIds]
  )

  const [prefs, setPrefs] = useState<TableLayoutPrefs>(() =>
    readTablePrefs(bucket, activeColumnIds)
  )
  const [seenLayoutKey, setSeenLayoutKey] = useState(`${bucket}:${activeColumnIds.join('\0')}`)
  const layoutKey = `${bucket}:${activeColumnIds.join('\0')}`
  if (layoutKey !== seenLayoutKey) {
    setSeenLayoutKey(layoutKey)
    setPrefs(readTablePrefs(bucket, activeColumnIds))
  }

  const setColumnOrder: OnChangeFn<string[]> = useCallback(
    (updater) => {
      setPrefs((prev) => {
        const columnOrder = sanitizeOrder(
          typeof updater === 'function' ? updater(prev.columnOrder) : updater,
          activeColumnIds
        )
        return updateTablePrefs(bucket, { columnOrder }, activeColumnIds)
      })
    },
    [activeColumnIds, bucket]
  )

  const setColumnSizing: OnChangeFn<ColumnSizingState> = useCallback(
    (updater) => {
      setPrefs((prev) => {
        const columnSizing = typeof updater === 'function' ? updater(prev.columnSizing) : updater
        return updateTablePrefs(bucket, { columnSizing }, activeColumnIds)
      })
    },
    [activeColumnIds, bucket]
  )

  const setColumnVisibility: OnChangeFn<ColumnVisibilityState> = useCallback(
    (updater) => {
      setPrefs((prev) => {
        const columnVisibility = sanitizeVisibility(
          typeof updater === 'function' ? updater(prev.columnVisibility) : updater,
          activeColumnIds,
          ledgerColumnIdsFromActive(activeColumnIds)
        )
        return updateTablePrefs(bucket, { columnVisibility }, activeColumnIds)
      })
    },
    [activeColumnIds, bucket]
  )

  const toggleColumnVisibility = useCallback(
    (columnId: RepaymentColumnId, visible: boolean) => {
      if (columnId === 'alertes') return
      setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
    },
    [setColumnVisibility]
  )

  return {
    activeColumnIds,
    columnOrder: prefs.columnOrder,
    setColumnOrder,
    columnSizing: prefs.columnSizing,
    setColumnSizing,
    columnVisibility: prefs.columnVisibility,
    setColumnVisibility,
    toggleColumnVisibility
  }
}
