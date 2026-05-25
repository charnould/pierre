import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type OnChangeFn,
  type SortingState,
  type Table as TanstackTable
} from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  ColumnDragProvider,
  type ColumnDragSortableData
} from '@/shared/components/ui/column-drag-context'
import { ColumnDragZoneBanners } from '@/shared/components/ui/column-drag-zone-banners'
import {
  getCommonPinningStyles,
  isLastLeftPinnedColumn
} from '@/shared/components/ui/data-table-pinning'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import { FIELD_FOCUS_VISIBLE } from '@/shared/lib/field-focus'
import { cn } from '@/shared/lib/utils'

type ServerPagination = {
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  label: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumnId?: string
  filterPlaceholder?: string
  emptyMessage?: string
  pageSize?: number
  columnPinning?: ColumnPinningState
  onColumnPinningChange?: OnChangeFn<ColumnPinningState>
  columnOrder?: string[]
  onColumnOrderChange?: OnChangeFn<string[]>
  columnVisibility?: ColumnVisibilityState
  onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>
  enableColumnResizing?: boolean
  columnResizeMode?: 'onChange' | 'onEnd'
  enableColumnDnD?: boolean
  lockedColumnIds?: string[]
  columnSizing?: ColumnSizingState
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>
  onRowClick?: (row: TData) => void
  paginate?: boolean
  showToolbar?: boolean
  serverPagination?: ServerPagination
  /** Edge-to-edge table: no outer border or rounded corners on the scroll container. */
  flush?: boolean
  /** Tighter row/header padding (tickets table). */
  dense?: boolean
  contentClassName?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder = 'Filtrer…',
  emptyMessage = 'Aucun résultat.',
  pageSize = 10,
  columnPinning: controlledColumnPinning,
  onColumnPinningChange,
  columnOrder: controlledColumnOrder,
  onColumnOrderChange,
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  enableColumnResizing = false,
  columnResizeMode = 'onChange',
  enableColumnDnD = false,
  lockedColumnIds = [],
  columnSizing,
  onColumnSizingChange,
  onRowClick,
  paginate = true,
  showToolbar = true,
  serverPagination,
  flush = false,
  dense = false,
  contentClassName
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalColumnPinning, setInternalColumnPinning] = useState<ColumnPinningState>({
    left: [],
    right: []
  })
  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>([])
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<ColumnVisibilityState>(
    {}
  )
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const [activeColumnTitle, setActiveColumnTitle] = useState('')

  const columnPinning = controlledColumnPinning ?? internalColumnPinning
  const setColumnPinning = onColumnPinningChange ?? setInternalColumnPinning
  const columnOrder = controlledColumnOrder ?? internalColumnOrder
  const setColumnOrder = onColumnOrderChange ?? setInternalColumnOrder
  const columnVisibility = controlledColumnVisibility ?? internalColumnVisibility
  const setColumnVisibility = onColumnVisibilityChange ?? setInternalColumnVisibility

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const table = useReactTable({
    data,
    columns,
    enableColumnPinning: Boolean(columnPinning.left?.length || columnPinning.right?.length),
    enableColumnResizing,
    columnResizeMode,
    defaultColumn: {
      minSize: 120,
      size: 180
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange,
    getCoreRowModel: getCoreRowModel(),
    ...(paginate ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: paginate ? { pagination: { pageSize } } : {},
    state: {
      sorting,
      columnFilters,
      columnPinning,
      columnOrder,
      columnVisibility,
      ...(enableColumnResizing && columnSizing !== undefined ? { columnSizing } : {})
    }
  })

  const tableWidth = table.getTotalSize()
  const rows = table.getRowModel().rows
  const headerGroup = table.getHeaderGroups()[0]
  const lockedSet = useMemo(() => new Set(lockedColumnIds), [lockedColumnIds])
  const sortableColumnIds =
    headerGroup?.headers
      .filter((header) => !header.isPlaceholder && !lockedSet.has(header.column.id))
      .map((header) => header.column.id) ?? []

  const visibleColumnIds = useMemo(
    () =>
      headerGroup?.headers
        .filter((header) => !header.isPlaceholder)
        .map((header) => header.column.id) ?? [],
    [headerGroup]
  )

  const pinnedLeft = columnPinning.left ?? []
  const pinnedSet = useMemo(() => new Set(pinnedLeft), [pinnedLeft])

  const { pinnedWidth, scrollWidth } = useMemo(() => {
    if (!headerGroup) return { pinnedWidth: 0, scrollWidth: 0 }
    let pinned = 0
    let scroll = 0
    for (const header of headerGroup.headers) {
      if (header.isPlaceholder) continue
      const size = header.column.getSize()
      if (pinnedSet.has(header.column.id)) pinned += size
      else scroll += size
    }
    return { pinnedWidth: pinned, scrollWidth: scroll }
  }, [headerGroup, pinnedSet])

  const clearDrag = useCallback(() => {
    setActiveColumnId(null)
    setOverColumnId(null)
    setActiveColumnTitle('')
  }, [])

  const handleColumnDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveColumnId(id)
    const data = event.active.data.current as ColumnDragSortableData | undefined
    setActiveColumnTitle(data?.title ?? id)
  }, [])

  const handleColumnDragOver = useCallback((event: DragOverEvent) => {
    setOverColumnId(event.over ? String(event.over.id) : null)
  }, [])

  const handleColumnDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const activeId = String(active.id)
        const overId = String(over.id)

        if (pinnedSet.has(activeId) && pinnedSet.has(overId)) {
          const oldIndex = pinnedLeft.indexOf(activeId)
          const newIndex = pinnedLeft.indexOf(overId)
          if (oldIndex !== -1 && newIndex !== -1) {
            setColumnPinning({
              ...columnPinning,
              left: arrayMove(pinnedLeft, oldIndex, newIndex)
            })
          }
        } else if (!pinnedSet.has(activeId) && !pinnedSet.has(overId)) {
          const oldIndex = columnOrder.indexOf(activeId)
          const newIndex = columnOrder.indexOf(overId)
          if (oldIndex !== -1 && newIndex !== -1) {
            setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex))
          }
        }
      }
      clearDrag()
    },
    [pinnedSet, pinnedLeft, columnPinning, setColumnPinning, columnOrder, setColumnOrder, clearDrag]
  )

  const handleColumnDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      clearDrag()
    },
    [clearDrag]
  )

  const isColumnDragging = activeColumnId !== null
  const activeIsPinned = activeColumnId !== null && pinnedSet.has(activeColumnId)
  const overIsPinned = overColumnId === null ? null : pinnedSet.has(overColumnId)
  const canDropActiveOver =
    activeColumnId !== null &&
    overColumnId !== null &&
    activeColumnId !== overColumnId &&
    pinnedSet.has(activeColumnId) === pinnedSet.has(overColumnId)

  const cellBorderClass = flush ? 'border-border border-r border-b' : 'border border-border'

  const cellOverflowClass = (column: { getIsPinned: () => false | 'left' | 'right' }) =>
    column.getIsPinned() ? 'overflow-visible' : 'overflow-hidden'

  const isCompactColumn = (column: { columnDef: { meta?: unknown } }) =>
    Boolean((column.columnDef.meta as { compact?: boolean } | undefined)?.compact)

  const isCompactFlushColumn = (column: { columnDef: { meta?: unknown } }) =>
    Boolean((column.columnDef.meta as { compactFlush?: boolean } | undefined)?.compactFlush)

  const hideCompactGroupRightBorder = (
    column: { columnDef: { meta?: unknown } },
    nextColumn: { columnDef: { meta?: unknown } } | undefined
  ) => isCompactColumn(column) && nextColumn !== undefined && isCompactColumn(nextColumn)

  const compactPaddingClass = 'px-0'

  const compactEdgePaddingClass = (
    column: { columnDef: { meta?: unknown } },
    previousColumn: { columnDef: { meta?: unknown } } | undefined,
    nextColumn: { columnDef: { meta?: unknown } } | undefined
  ) => {
    if (isCompactFlushColumn(column)) return null
    const compact = isCompactColumn(column)
    const firstInGroup =
      compact && (previousColumn === undefined || !isCompactColumn(previousColumn))
    const lastInGroup = compact && (nextColumn === undefined || !isCompactColumn(nextColumn))
    return cn(firstInGroup && 'pl-1.5', lastInGroup && 'pr-1.5')
  }

  const compactCellPaddingClass = (column: { columnDef: { meta?: unknown } }) =>
    isCompactFlushColumn(column) ? 'relative !p-0 align-top' : 'py-[2px]'

  const compactHeaderPaddingClass = (column: { columnDef: { meta?: unknown } }) =>
    isCompactFlushColumn(column) ? 'relative !h-8 !p-0 align-top' : 'py-0'

  const compactInnerClass = (column: { columnDef: { meta?: unknown } }) => {
    if (isCompactFlushColumn(column)) return 'absolute inset-0 flex items-stretch'
    if (isCompactColumn(column)) return 'flex min-w-0 items-center justify-center px-0'
    return 'flex min-w-0 items-center px-1'
  }

  const compactHeaderInnerClass = (column: { columnDef: { meta?: unknown } }) => {
    if (isCompactFlushColumn(column)) return 'absolute inset-0 flex items-stretch overflow-visible'
    if (isCompactColumn(column))
      return 'flex w-full min-w-0 items-center justify-center overflow-visible'
    return 'flex w-full min-w-0 overflow-hidden'
  }

  const headerRow = headerGroup ? (
    <TableRow className="border-0 hover:bg-transparent">
      {headerGroup.headers.map((header, headerIndex) => {
        const isLocked = lockedSet.has(header.column.id)
        const compact = isCompactColumn(header.column)
        const previousHeader = headerGroup.headers[headerIndex - 1]
        const nextHeader = headerGroup.headers[headerIndex + 1]
        const hideRightBorder =
          hideCompactGroupRightBorder(header.column, nextHeader?.column) ||
          (flush && isLastLeftPinnedColumn(header.column))
        return (
          <TableHead
            key={header.id}
            className={cn(
              'relative',
              cellBorderClass,
              dense &&
                (compact
                  ? cn(
                      'h-8',
                      compactHeaderPaddingClass(header.column),
                      compactPaddingClass,
                      compactEdgePaddingClass(
                        header.column,
                        previousHeader?.column,
                        nextHeader?.column
                      )
                    )
                  : 'h-8 px-2 py-0'),
              hideRightBorder && 'border-r-0',
              isLocked || dense || isColumnDragging
                ? 'overflow-visible'
                : cellOverflowClass(header.column)
            )}
            style={getCommonPinningStyles(header.column, true)}
          >
            <div
              className={
                compact
                  ? compactHeaderInnerClass(header.column)
                  : 'flex w-full min-w-0 overflow-hidden'
              }
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </div>
            {enableColumnResizing && header.column.getCanResize() ? (
              <div
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                onDoubleClick={() => header.column.resetSize()}
                className={cn(
                  'absolute top-0 right-0 z-20 h-full w-1 cursor-col-resize touch-none',
                  'hover:bg-primary/50 active:bg-primary',
                  header.column.getIsResizing() && 'bg-primary'
                )}
              />
            ) : null}
          </TableHead>
        )
      })}
    </TableRow>
  ) : null

  const tableElement = (
    <Table
      noWrapper
      fixedLayout
      className={cn(
        'border-border border-separate border-spacing-0',
        !flush && 'border-collapse border'
      )}
      style={{ width: tableWidth, minWidth: tableWidth }}
    >
      <TableHeader
        className={cn(
          'sticky top-0 z-10 [&_th]:border-border [&_tr]:border-0',
          dense
            ? 'bg-muted/35 supports-[backdrop-filter]:bg-muted/25 supports-[backdrop-filter]:backdrop-blur-sm'
            : 'bg-background'
        )}
      >
        {enableColumnDnD && headerRow ? (
          <SortableContext items={sortableColumnIds} strategy={horizontalListSortingStrategy}>
            {headerRow}
          </SortableContext>
        ) : (
          headerRow
        )}
      </TableHeader>
      <TableBody>
        {rows.length ? (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                'border-0',
                dense && 'even:bg-muted/15 hover:bg-muted/30',
                onRowClick && 'cursor-pointer'
              )}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell, cellIndex) => {
                const isLocked = lockedSet.has(cell.column.id)
                const compact = isCompactColumn(cell.column)
                const previousCell = row.getVisibleCells()[cellIndex - 1]
                const nextCell = row.getVisibleCells()[cellIndex + 1]
                const hideRightBorder =
                  hideCompactGroupRightBorder(cell.column, nextCell?.column) ||
                  (flush && isLastLeftPinnedColumn(cell.column))
                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cellBorderClass,
                      dense &&
                        (compact
                          ? cn(
                              compactCellPaddingClass(cell.column),
                              compactPaddingClass,
                              compactEdgePaddingClass(
                                cell.column,
                                previousCell?.column,
                                nextCell?.column
                              )
                            )
                          : 'px-2 py-[5px]'),
                      hideRightBorder && 'border-r-0',
                      isLocked ? 'overflow-visible' : cellOverflowClass(cell.column)
                    )}
                    style={getCommonPinningStyles(cell.column)}
                  >
                    <div
                      className={
                        compact ? compactInnerClass(cell.column) : 'flex min-w-0 items-center px-1'
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                )
              })}
            </TableRow>
          ))
        ) : (
          <TableRow className="border-0">
            <TableCell colSpan={columns.length} className={cn(cellBorderClass, 'h-24 text-center')}>
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className={cn('flex h-full min-h-0 w-full min-w-0 flex-1 flex-col', !flush && 'gap-3')}>
      {showToolbar && filterColumnId ? (
        <DataTableToolbar
          table={table}
          filterColumnId={filterColumnId}
          filterPlaceholder={filterPlaceholder}
        />
      ) : null}

      <div
        className={cn(
          'relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto',
          !flush && 'rounded-md border',
          isColumnDragging && 'pt-7',
          contentClassName
        )}
      >
        {enableColumnDnD ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleColumnDragStart}
            onDragOver={handleColumnDragOver}
            onDragEnd={handleColumnDragEnd}
            onDragCancel={handleColumnDragCancel}
          >
            <ColumnDragProvider
              pinnedLeft={pinnedLeft}
              visibleColumnIds={visibleColumnIds}
              activeColumnId={activeColumnId}
              overColumnId={overColumnId}
            >
              {isColumnDragging ? (
                <ColumnDragZoneBanners
                  pinnedWidth={pinnedWidth}
                  scrollWidth={scrollWidth}
                  activeIsPinned={activeIsPinned}
                  overIsPinned={overIsPinned}
                  hasOver={overColumnId !== null}
                />
              ) : null}
              {tableElement}
            </ColumnDragProvider>
            <DragOverlay dropAnimation={null}>
              {activeColumnId ? (
                <div
                  className={cn(
                    'bg-background flex max-w-xs flex-col gap-0.5 rounded-lg border-2 px-3 py-2 shadow-lg',
                    canDropActiveOver ? 'border-primary' : 'border-destructive'
                  )}
                >
                  <span className="text-muted-foreground text-xs">Vous déplacez :</span>
                  <span className="truncate text-sm font-semibold">{activeColumnTitle}</span>
                  {!canDropActiveOver && overColumnId ? (
                    <span className="text-destructive text-xs">Impossible ici</span>
                  ) : null}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          tableElement
        )}
      </div>

      {serverPagination ? (
        <ServerPaginationFooter pagination={serverPagination} />
      ) : paginate ? (
        <DataTablePagination table={table} />
      ) : null}
    </div>
  )
}

function DataTableToolbar<TData>({
  table,
  filterColumnId,
  filterPlaceholder
}: {
  table: TanstackTable<TData>
  filterColumnId: string
  filterPlaceholder: string
}) {
  const column = table.getColumn(filterColumnId)
  if (!column) return null

  return (
    <input
      placeholder={filterPlaceholder}
      value={(column.getFilterValue() as string) ?? ''}
      onChange={(e) => column.setFilterValue(e.target.value)}
      className={cn(
        'border-input bg-background placeholder:text-muted-foreground h-8 max-w-sm rounded-lg border px-2.5 text-sm outline-none',
        FIELD_FOCUS_VISIBLE
      )}
    />
  )
}

function ServerPaginationFooter({ pagination }: { pagination: ServerPagination }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <p className="text-muted-foreground text-sm">{pagination.label}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.onPrevious}
          disabled={!pagination.canPrevious}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.onNext}
          disabled={!pagination.canNext}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}

function DataTablePagination<TData>({ table }: { table: TanstackTable<TData> }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <p className="text-muted-foreground text-sm">
        {table.getFilteredRowModel().rows.length} réclamation
        {table.getFilteredRowModel().rows.length > 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}
