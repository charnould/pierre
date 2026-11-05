import {
  type ColumnSizingState,
  type ColumnVisibilityState,
  type OnChangeFn,
  type SortingState,
  useTable
} from '@tanstack/react-table'
import { memo, type RefObject, useMemo } from 'react'

import {
  BOARD_DATA_COLUMN_MIN_WIDTH,
  BoardDualTable
} from '@/shared/components/table/board-dual-table'
import { BoardTableDataRow } from '@/shared/components/table/board-table-data-row'
import { pierreTableFeatures } from '@/shared/components/table/table-features'
import { useOrgUsersVersion } from '@/shared/hooks/useUserAvatar'
import type { ColumnFilters, ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import type { TenantLastAction } from '../lib/repayment-last-action'
import type { RepaymentRowSignal } from '../lib/repayment-row-signal'
import { pinLockedRepaymentColumns, type RepaymentColumnId } from '../lib/repayment-table-columns'
import { buildRepaymentColumns } from './repayment-columns'

function columnSizingEqual(a: ColumnSizingState, b: ColumnSizingState): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

interface Props {
  rows: TenantRepaymentRow[]
  allRows: TenantRepaymentRow[]
  activeColumnIds: RepaymentColumnId[]
  columnOrder: string[]
  onColumnOrderChange: OnChangeFn<string[]>
  columnSizing: ColumnSizingState
  onColumnSizingChange: OnChangeFn<ColumnSizingState>
  columnVisibility: ColumnVisibilityState
  onColumnVisibilityChange: OnChangeFn<ColumnVisibilityState>
  columnFilters: ColumnFilters
  onColumnFiltersChange: (filters: ColumnFilters) => void
  columnSorting: SortingState
  onColumnSortingChange: OnChangeFn<SortingState>
  selectedId: string | null
  onRowClick: (row: TenantRepaymentRow) => void
  onRowHover?: (row: TenantRepaymentRow) => void
  getBucket?: (row: TenantRepaymentRow) => RepaymentBucketId
  getLastAction?: (row: TenantRepaymentRow) => TenantLastAction | null
  getRowSignal?: (row: TenantRepaymentRow) => RepaymentRowSignal | null
  snapshotDate?: string
  columnValues?: ColumnValuesConfig
  onColumnValuesChange?: (
    updater: ColumnValuesConfig | ((prev: ColumnValuesConfig | undefined) => ColumnValuesConfig)
  ) => void
  emptyMessage?: string
  scrollRef: RefObject<HTMLElement | null>
}

export const RepaymentTableView = memo(function RepaymentTableView({
  rows,
  allRows,
  activeColumnIds,
  columnOrder,
  onColumnOrderChange,
  columnSizing,
  onColumnSizingChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnFilters,
  onColumnFiltersChange,
  columnSorting,
  onColumnSortingChange,
  selectedId,
  onRowClick,
  onRowHover,
  getBucket,
  getLastAction,
  getRowSignal,
  snapshotDate,
  columnValues,
  onColumnValuesChange,
  emptyMessage = 'Aucun dossier dans cette phase.',
  scrollRef
}: Props) {
  const orgUsersVersion = useOrgUsersVersion()

  const columns = useMemo(() => {
    // Rebuild when org-users cache updates so gestionnaire accessor labels refresh.
    void orgUsersVersion
    return buildRepaymentColumns({
      allRows,
      activeColumnIds,
      columnFilters,
      onColumnFiltersChange,
      columnValues,
      onColumnValuesChange,
      getBucket,
      getLastAction,
      getRowSignal,
      snapshotDate
    })
  }, [
    allRows,
    activeColumnIds,
    columnFilters,
    onColumnFiltersChange,
    columnValues,
    onColumnValuesChange,
    getBucket,
    getLastAction,
    getRowSignal,
    snapshotDate,
    orgUsersVersion
  ])

  const tableColumnOrder = useMemo(
    () => pinLockedRepaymentColumns(columnOrder, activeColumnIds),
    [columnOrder, activeColumnIds]
  )

  const handleColumnSizingChange = useMemo<OnChangeFn<ColumnSizingState>>(
    () => (updater) => {
      const next = typeof updater === 'function' ? updater(columnSizing) : updater
      if (columnSizingEqual(next, columnSizing)) return
      onColumnSizingChange(next)
    },
    [columnSizing, onColumnSizingChange]
  )

  const tableOptions = useMemo(
    () => ({
      features: pierreTableFeatures,
      data: rows,
      columns,
      getRowId: (row: TenantRepaymentRow) => row.id_locataire,
      defaultColumn: { minSize: BOARD_DATA_COLUMN_MIN_WIDTH },
      enableColumnResizing: true,
      columnResizeMode: 'onEnd' as const,
      onSortingChange: onColumnSortingChange,
      onColumnVisibilityChange,
      onColumnOrderChange,
      onColumnSizingChange: handleColumnSizingChange,
      state: {
        sorting: columnSorting,
        columnVisibility,
        columnOrder: tableColumnOrder,
        columnSizing
      }
    }),
    [
      rows,
      columns,
      onColumnSortingChange,
      onColumnVisibilityChange,
      onColumnOrderChange,
      handleColumnSizingChange,
      columnSorting,
      columnVisibility,
      tableColumnOrder,
      columnSizing
    ]
  )

  const dataTable = useTable(tableOptions)
  const tableRows = dataTable.getRowModel().rows
  const headerGroups = dataTable.getHeaderGroups()
  const leafHeaders = headerGroups[0]?.headers ?? []

  return (
    <BoardDualTable
      headerGroups={headerGroups}
      leafHeaders={leafHeaders}
      rows={tableRows}
      scrollRef={scrollRef}
      emptyMessage={emptyMessage}
      renderRow={(row, { index, measureRef }) => (
        <BoardTableDataRow
          row={row}
          index={index}
          measureRef={measureRef}
          rowId={row.original.id_locataire}
          selected={row.original.id_locataire === selectedId}
          onActivate={onRowClick}
          onHover={onRowHover}
        />
      )}
    />
  )
})
