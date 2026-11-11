import {
  type ColumnSizingState,
  type SortingState,
  type Updater,
  useTable
} from '@tanstack/react-table'
import { FilterX } from 'lucide-react'
import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react'

import { BoardSelectionProvider } from '@/shared/components/board/board-selection'
import { BoardPhaseSection } from '@/shared/components/board/board-surface'
import {
  BOARD_DATA_COLUMN_MIN_WIDTH,
  BoardDualTable
} from '@/shared/components/table/board-dual-table'
import { BoardTableDataRow } from '@/shared/components/table/board-table-data-row'
import { pierreTableFeatures } from '@/shared/components/table/table-features'
import { Button } from '@/shared/components/ui/button'
import { useDebouncedTablePatch } from '@/shared/hooks/useDebouncedTablePatch'
import { useTickets } from '@/shared/hooks/useTickets'
import { getTicketId } from '@/shared/lib/ticket-row'
import type { TicketsTableSettings } from '@/shared/lib/ui-settings/schema'
import type { ColumnVisibilityState } from '@/shared/lib/ui-settings/tickets-table'
import {
  areColumnFiltersEqual,
  clearAllColumnFilters,
  type ColumnFilters,
  hasActiveColumnFilters,
  hiddenColumnsToColumnVisibility,
  resolveColumnOrder,
  sanitizeColumnFilters,
  stripTicketTableSystemColumns,
  TICKET_TABLE_ALERT_COLUMN_ID,
  TICKET_TABLE_SELECTION_COLUMN_ID,
  ticketServerSort,
  ticketTableSystemColumnSizing
} from '@/shared/lib/ui-settings/tickets-table'
import {
  buildHiddenColumnsPatch,
  patchForVisibilityChange,
  ticketsTablePreferencesReducer
} from '@/shared/lib/ui-settings/tickets-table-preferences'
import type { TicketRow } from '@/shared/types'

import { useUiSettings } from '../../../contexts/UiSettingsContext'
import { buildTicketsColumns } from './tickets-columns'
import { SKELETON_TICKET_COLUMNS } from './tickets-table-skeleton-columns'
import { TicketsColumnVisibilityMenu } from './TicketsColumnVisibilityMenu'
import { TicketsTableSkeleton } from './TicketsTableSkeleton'

interface Props {
  hidden: boolean
  url: string | undefined
  title: string
  bucket: string
  refreshNonce?: number
  hasUnread: (row: TicketRow) => boolean
  selectedId?: string
  checkedIds: ReadonlySet<string>
  selectionDisabled: boolean
  onSelectionChange: (id: string, checked: boolean, row: TicketRow | null) => void
  onLoadingChange: (bucket: string, loading: boolean) => void
  onRowClick: (row: TicketRow) => void
  scrollRef: RefObject<HTMLElement | null>
}

function applyUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(previous) : updater
}

function preferencesFromSettings(
  tableSettings: TicketsTableSettings | undefined
): ReturnType<typeof ticketsTablePreferencesReducer> {
  return ticketsTablePreferencesReducer(
    {
      columnOrder: [],
      columnFilters: {},
      hiddenColumns: [],
      pinnedColumns: undefined,
      columnWidths: {}
    },
    { type: 'sync_from_settings', settings: tableSettings }
  )
}

function columnSizingEqual(a: ColumnSizingState, b: ColumnSizingState): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

export const TicketsTableView = memo(function TicketsTableView({
  hidden,
  url,
  title,
  bucket,
  refreshNonce,
  hasUnread,
  selectedId,
  checkedIds,
  selectionDisabled,
  onSelectionChange,
  onLoadingChange,
  onRowClick,
  scrollRef
}: Props) {
  const { settings, settingsEpoch } = useUiSettings()
  const tableSettings = settings.tickets?.table
  const isDirtyRef = useRef(false)
  const lastEpochRef = useRef(settingsEpoch)

  const [prefs, dispatch] = useReducer(
    ticketsTablePreferencesReducer,
    tableSettings,
    preferencesFromSettings
  )

  const [sorting, setSorting] = useState<SortingState>([])

  const debouncedPatch = useDebouncedTablePatch({
    delayMs: 400,
    onDirty: () => {
      isDirtyRef.current = true
    },
    onPersisted: () => {
      isDirtyRef.current = false
    }
  })

  useEffect(() => {
    const epochChanged = settingsEpoch !== lastEpochRef.current
    if (epochChanged) {
      lastEpochRef.current = settingsEpoch
      isDirtyRef.current = false
      dispatch({ type: 'sync_from_settings', settings: tableSettings })
      return
    }
    if (!isDirtyRef.current) {
      dispatch({ type: 'sync_from_settings', settings: tableSettings })
    }
  }, [tableSettings, settingsEpoch])

  const { columnOrder, columnFilters, hiddenColumns, pinnedColumns, columnWidths } = prefs

  const {
    data,
    columns,
    meta,
    loading,
    error,
    offset,
    prevPage,
    nextPage,
    canPrevPage,
    canNextPage
  } = useTickets(url, hidden, {
    bucket,
    columnFilters,
    refreshNonce,
    sort: ticketServerSort(sorting[0])
  })

  useEffect(() => {
    onLoadingChange(bucket, loading)
  }, [bucket, loading, onLoadingChange])

  useEffect(
    () => () => {
      onLoadingChange(bucket, false)
    },
    [bucket, onLoadingChange]
  )

  const showSkeleton = (loading && data.length === 0) || !!error || columns.length === 0

  const menuColumns = showSkeleton ? SKELETON_TICKET_COLUMNS : columns

  const schemaNames = useMemo(() => columns.map((c) => c.name), [columns])

  useEffect(() => {
    if (showSkeleton || schemaNames.length === 0) return
    const sanitized = sanitizeColumnFilters(columnFilters, schemaNames)
    if (areColumnFiltersEqual(sanitized, columnFilters)) return
    dispatch({ type: 'set_filters', columnFilters: sanitized })
    debouncedPatch({
      columnFilters: hasActiveColumnFilters(sanitized) ? sanitized : {}
    })
  }, [columnFilters, schemaNames, debouncedPatch, showSkeleton])

  const columnVisibility = useMemo(
    () => hiddenColumnsToColumnVisibility(schemaNames, hiddenColumns),
    [schemaNames, hiddenColumns]
  )

  const tableColumnOrder = useMemo(
    () => [
      TICKET_TABLE_SELECTION_COLUMN_ID,
      TICKET_TABLE_ALERT_COLUMN_ID,
      ...resolveColumnOrder(schemaNames, columnOrder.length > 0 ? columnOrder : undefined)
    ],
    [schemaNames, columnOrder]
  )

  const handleFiltersChange = useCallback(
    (next: ColumnFilters) => {
      const active = hasActiveColumnFilters(next)
      const normalized = active ? next : clearAllColumnFilters()
      dispatch({ type: 'set_filters', columnFilters: normalized })
      debouncedPatch({ columnFilters: active ? next : {} })
    },
    [debouncedPatch]
  )

  const handleClearAllFilters = useCallback(() => {
    handleFiltersChange(clearAllColumnFilters())
  }, [handleFiltersChange])

  const handleHiddenChange = useCallback(
    (next: string[]) => {
      dispatch({ type: 'set_hidden', hiddenColumns: next })
      debouncedPatch(buildHiddenColumnsPatch(next, pinnedColumns))
    },
    [debouncedPatch, pinnedColumns]
  )

  const handleColumnVisibilityChange = useCallback(
    (updater: Updater<ColumnVisibilityState>) => {
      const prevVisibility = hiddenColumnsToColumnVisibility(schemaNames, hiddenColumns)
      const nextVisibility = applyUpdater(updater, prevVisibility)
      const { patch } = patchForVisibilityChange(prefs, schemaNames, nextVisibility)
      dispatch({
        type: 'set_visibility',
        schemaNames,
        visibility: nextVisibility
      })
      debouncedPatch(patch)
    },
    [debouncedPatch, hiddenColumns, prefs, schemaNames]
  )

  const handleColumnOrderChange = useCallback(
    (updater: Updater<string[]>) => {
      const next = stripTicketTableSystemColumns(applyUpdater(updater, tableColumnOrder))
      dispatch({ type: 'set_column_order', columnOrder: next })
      debouncedPatch({ columnOrder: next })
    },
    [debouncedPatch, tableColumnOrder]
  )

  const columnSizing = useMemo<ColumnSizingState>(
    () => ({
      ...ticketTableSystemColumnSizing(),
      ...columnWidths
    }),
    [columnWidths]
  )

  const handleColumnSizingChange = useCallback(
    (updater: Updater<ColumnSizingState>) => {
      const next = applyUpdater(updater, columnSizing)
      if (columnSizingEqual(next, columnSizing)) return
      const {
        [TICKET_TABLE_SELECTION_COLUMN_ID]: _selection,
        [TICKET_TABLE_ALERT_COLUMN_ID]: _alert,
        ...widths
      } = next
      dispatch({ type: 'set_widths', columnWidths: widths })
      debouncedPatch({
        columnWidths: Object.keys(widths).length > 0 ? widths : undefined
      })
    },
    [columnSizing, debouncedPatch]
  )

  if (hidden) return null

  return (
    <TicketsTableBoard
      title={title}
      data={data}
      columns={columns}
      settings={settings}
      columnFilters={columnFilters}
      url={url}
      showSkeleton={showSkeleton}
      hasUnread={hasUnread}
      selectedId={selectedId}
      checkedIds={checkedIds}
      selectionDisabled={selectionDisabled}
      onSelectionChange={onSelectionChange}
      onRowClick={onRowClick}
      scrollRef={scrollRef}
      menuColumns={menuColumns}
      hiddenColumns={hiddenColumns}
      onHiddenChange={handleHiddenChange}
      onClearAllFilters={handleClearAllFilters}
      columnVisibility={columnVisibility}
      tableColumnOrder={tableColumnOrder}
      onColumnVisibilityChange={handleColumnVisibilityChange}
      onColumnOrderChange={handleColumnOrderChange}
      onColumnSizingChange={handleColumnSizingChange}
      columnSizing={columnSizing}
      sorting={sorting}
      onSortingChange={setSorting}
      onFiltersChange={handleFiltersChange}
      total={meta?.total ?? 0}
      offset={offset}
      error={error}
      canPrevPage={canPrevPage}
      canNextPage={canNextPage}
      onPrevPage={prevPage}
      onNextPage={nextPage}
    />
  )
})

function TicketsTableBoard({
  title,
  data,
  columns,
  settings,
  columnFilters,
  url,
  showSkeleton,
  hasUnread,
  selectedId,
  checkedIds,
  selectionDisabled,
  onSelectionChange,
  onRowClick,
  scrollRef,
  menuColumns,
  hiddenColumns,
  onHiddenChange,
  onClearAllFilters,
  columnVisibility,
  tableColumnOrder,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onColumnSizingChange,
  columnSizing,
  sorting,
  onSortingChange,
  onFiltersChange,
  total,
  offset,
  error,
  canPrevPage,
  canNextPage,
  onPrevPage,
  onNextPage
}: {
  title: string
  data: TicketRow[]
  columns: ReturnType<typeof useTickets>['columns']
  settings: ReturnType<typeof useUiSettings>['settings']
  columnFilters: ColumnFilters
  url: string | undefined
  showSkeleton: boolean
  hasUnread: (row: TicketRow) => boolean
  selectedId?: string
  checkedIds: ReadonlySet<string>
  selectionDisabled: boolean
  onSelectionChange: (id: string, checked: boolean, row: TicketRow | null) => void
  onRowClick: (row: TicketRow) => void
  scrollRef: RefObject<HTMLElement | null>
  menuColumns: ReturnType<typeof useTickets>['columns']
  hiddenColumns: string[]
  onHiddenChange: (next: string[]) => void
  onClearAllFilters: () => void
  columnVisibility: ColumnVisibilityState
  tableColumnOrder: string[]
  onColumnVisibilityChange: (updater: Updater<ColumnVisibilityState>) => void
  onColumnOrderChange: (updater: Updater<string[]>) => void
  onColumnSizingChange: (updater: Updater<ColumnSizingState>) => void
  columnSizing: ColumnSizingState
  sorting: SortingState
  onSortingChange: (updater: Updater<SortingState>) => void
  onFiltersChange: (next: ColumnFilters) => void
  total: number
  offset: number
  error: string | null
  canPrevPage: boolean
  canNextPage: boolean
  onPrevPage: () => void
  onNextPage: () => void
}) {
  const tableColumns = useMemo(
    () =>
      buildTicketsColumns(columns, {
        settings,
        columnFilters,
        url,
        onColumnFiltersChange: showSkeleton ? undefined : onFiltersChange,
        hasUnread
      }),
    [columns, settings, columnFilters, url, onFiltersChange, showSkeleton, hasUnread]
  )
  const tableOptions = useMemo(
    () => ({
      features: pierreTableFeatures,
      data,
      columns: tableColumns,
      getRowId: (row: TicketRow) => getTicketId(row) ?? String(row.id_reclamation ?? ''),
      defaultColumn: { minSize: BOARD_DATA_COLUMN_MIN_WIDTH },
      enableColumnResizing: true,
      columnResizeMode: 'onEnd' as const,
      manualSorting: ticketServerSort(sorting[0]) != null,
      onSortingChange,
      onColumnVisibilityChange,
      onColumnOrderChange,
      onColumnSizingChange,
      state: {
        sorting,
        columnVisibility,
        columnOrder: tableColumnOrder,
        columnSizing
      }
    }),
    [
      data,
      tableColumns,
      onColumnVisibilityChange,
      onColumnOrderChange,
      onColumnSizingChange,
      onSortingChange,
      sorting,
      columnVisibility,
      tableColumnOrder,
      columnSizing
    ]
  )
  const dataTable = useTable(tableOptions)
  const tableRows = dataTable.getRowModel().rows
  const headerGroups = dataTable.getHeaderGroups()
  const leafHeaders = headerGroups[0]?.headers ?? []
  const rangeStart = total === 0 ? 0 : offset + 1
  const rangeEnd = offset + data.length
  const paginationLabel = showSkeleton
    ? '—'
    : total === 0
      ? '0 réclamation'
      : `${rangeStart}–${rangeEnd} sur ${total}`
  const hasActiveFilters = hasActiveColumnFilters(columnFilters)
  const selection = useMemo(
    () => ({
      checkedIds,
      disabled: selectionDisabled,
      onCheckedChange: (id: string, checked: boolean) => {
        const row = data.find((entry) => getTicketId(entry) === id) ?? null
        onSelectionChange(id, checked, checked ? row : null)
      }
    }),
    [checkedIds, data, onSelectionChange, selectionDisabled]
  )
  const phaseActions = (
    <>
      <TicketsColumnVisibilityMenu
        columns={menuColumns}
        settings={settings}
        hiddenColumns={hiddenColumns}
        onHiddenChange={onHiddenChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasActiveFilters || showSkeleton}
        onClick={onClearAllFilters}
      >
        <FilterX data-icon="inline-start" />
        Effacer les filtres
      </Button>
      {canPrevPage || canNextPage ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevPage}
            disabled={showSkeleton || !canPrevPage}
          >
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={showSkeleton || !canNextPage}
          >
            Suivant
          </Button>
        </>
      ) : null}
    </>
  )
  const phaseEmpty = !showSkeleton && !error && total === 0 && !hasActiveFilters
  const filteredEmpty = !showSkeleton && !error && total === 0 && hasActiveFilters

  return (
    <BoardSelectionProvider value={selection}>
      <BoardPhaseSection
        title={title}
        meta={paginationLabel}
        actions={phaseActions}
        empty={phaseEmpty}
        note={
          error
            ? error
            : phaseEmpty
              ? undefined
              : filteredEmpty
                ? 'Aucune réclamation ne correspond aux filtres.'
                : undefined
        }
      >
        {error || phaseEmpty || filteredEmpty ? null : showSkeleton ? (
          <TicketsTableSkeleton columns={SKELETON_TICKET_COLUMNS} settings={settings} />
        ) : (
          <BoardDualTable
            headerGroups={headerGroups}
            leafHeaders={leafHeaders}
            rows={tableRows}
            scrollRef={scrollRef}
            emptyMessage="Aucune réclamation importée."
            renderRow={(row, { index, measureRef }) => (
              <BoardTableDataRow
                row={row}
                index={index}
                measureRef={measureRef}
                rowId={getTicketId(row.original) ?? row.id}
                selected={row.id === selectedId}
                onActivate={(ticket) => onRowClick(ticket)}
              />
            )}
          />
        )}
      </BoardPhaseSection>
    </BoardSelectionProvider>
  )
}
