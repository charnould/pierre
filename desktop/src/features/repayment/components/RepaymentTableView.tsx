import {
  flexRender,
  useTable,
  type ColumnSizingState,
  type OnChangeFn,
  type SortingState,
  type ColumnVisibilityState
} from '@tanstack/react-table'
import { memo, useCallback, useMemo, useRef, type RefObject, type UIEvent } from 'react'

import type {
  AnyPierreHeader,
  AnyPierreRow
} from '@/shared/components/table/column-header-options-menu'
import { ColumnResizeHandle } from '@/shared/components/table/column-resize-handle'
import { pierreTableFeatures } from '@/shared/components/table/table-features'
import { VirtualizedTableBody } from '@/shared/components/table/VirtualizedTableBody'
import { TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
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
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)

  const syncScrollLeft = useCallback((source: 'header' | 'body', scrollLeft: number) => {
    if (syncingScroll.current) return
    syncingScroll.current = true
    const target = source === 'header' ? bodyScrollRef.current : headerScrollRef.current
    if (target && target.scrollLeft !== scrollLeft) target.scrollLeft = scrollLeft
    syncingScroll.current = false
  }, [])

  const onHeaderScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      syncScrollLeft('header', event.currentTarget.scrollLeft)
    },
    [syncScrollLeft]
  )

  const onBodyScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      syncScrollLeft('body', event.currentTarget.scrollLeft)
    },
    [syncScrollLeft]
  )

  const orgUsersVersion = useOrgUsersVersion()

  const columns = useMemo(() => {
    // Rebuild when org-users cache updates so gestionnaire accessor labels refresh.
    void orgUsersVersion
    return buildRepaymentColumns({
      rows,
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
    rows,
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
  const tableRows = dataTable.getRowModel().rows as AnyPierreRow[]
  const headerGroups = dataTable.getHeaderGroups()
  const leafHeaders = headerGroups[0]?.headers ?? []
  const tableWidth = leafHeaders.reduce((sum, header) => sum + header.getSize(), 0)

  const colgroup = () => (
    <colgroup>
      {leafHeaders.map((header) => (
        <col key={header.id} style={{ width: header.getSize() }} />
      ))}
    </colgroup>
  )

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={headerScrollRef}
        onScroll={onHeaderScroll}
        className="bg-background sticky z-10 scrollbar-none overflow-x-auto"
        style={{ top: 'var(--repayment-bucket-chrome-height, 0px)' }}
      >
        <table
          className="table-fixed caption-bottom font-sans text-[0.8125rem] leading-5 tabular-nums"
          style={{ width: tableWidth }}
        >
          {colgroup()}
          <TableHeader>
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-background border-border relative h-9 border-b px-2 text-start"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    <ColumnResizeHandle header={header as AnyPierreHeader} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        </table>
      </div>

      <div ref={bodyScrollRef} onScroll={onBodyScroll} className="overflow-x-auto">
        <table
          className="table-fixed caption-bottom font-sans text-[0.8125rem] leading-5 tabular-nums"
          style={{ width: tableWidth }}
        >
          {colgroup()}
          <VirtualizedTableBody
            rows={tableRows}
            scrollRef={scrollRef}
            columnCount={columns.length}
            emptyMessage={emptyMessage}
            renderRow={(row, { index, measureRef }) => {
              const original = row.original as TenantRepaymentRow
              return (
                <TableRow
                  key={row.id}
                  data-index={index}
                  ref={measureRef}
                  className="cursor-pointer"
                  data-state={original.id_locataire === selectedId ? 'selected' : undefined}
                  onClick={() => onRowClick(original)}
                  onPointerEnter={onRowHover ? () => onRowHover(original) : undefined}
                  onFocus={onRowHover ? () => onRowHover(original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="max-w-0 overflow-hidden text-start">
                      <div className="truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              )
            }}
          />
        </table>
      </div>
    </div>
  )
})
