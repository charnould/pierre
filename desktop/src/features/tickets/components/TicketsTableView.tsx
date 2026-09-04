import {
  flexRender,
  useTable,
  type SortingState,
  type Updater,
  type ColumnSizingState
} from '@tanstack/react-table'
import { FilterX, RefreshCw } from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type RefObject
} from 'react'

import { BoardDualTable } from '@/shared/components/table/board-dual-table'
import { BoardTableSection } from '@/shared/components/table/board-table-section'
import { pierreTableFeatures } from '@/shared/components/table/table-features'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { TableCell, TableRow } from '@/shared/components/ui/table'
import { useDebouncedTablePatch } from '@/shared/hooks/useDebouncedTablePatch'
import { useTickets } from '@/shared/hooks/useTickets'
import { getTicketId } from '@/shared/lib/ticket-row'
import type { TicketsTableSettings } from '@/shared/lib/ui-settings/schema'
import type { ColumnVisibilityState } from '@/shared/lib/ui-settings/tickets-table'
import {
  areColumnFiltersEqual,
  clearAllColumnFilters,
  hasActiveColumnFilters,
  hiddenColumnsToColumnVisibility,
  resolveColumnOrder,
  sanitizeColumnFilters,
  stripTicketTableSystemColumns,
  ticketTableSystemColumnSizing,
  TICKET_TABLE_ALERT_COLUMN_ID,
  type ColumnFilters
} from '@/shared/lib/ui-settings/tickets-table'
import {
  buildHiddenColumnsPatch,
  patchForVisibilityChange,
  ticketsTablePreferencesReducer
} from '@/shared/lib/ui-settings/tickets-table-preferences'
import { cn } from '@/shared/lib/utils'
import type { TicketRow } from '@/shared/types'

import { useUiSettings } from '../../../contexts/UiSettingsContext'
import { buildTicketsColumns } from './tickets-columns'
import { SKELETON_TICKET_COLUMNS } from './tickets-table-skeleton-columns'
import { TicketsColumnVisibilityMenu } from './TicketsColumnVisibilityMenu'
import { TicketsTableSkeleton } from './TicketsTableSkeleton'

interface Props {
  hidden: boolean
  url: string | undefined
  bucket: string
  title: string
  refreshNonce?: number
  hasUnread: (row: TicketRow) => boolean
  selectedId?: string
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
  bucket,
  title,
  refreshNonce,
  hasUnread,
  selectedId,
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
    reload,
    prevPage,
    nextPage,
    canPrevPage,
    canNextPage
  } = useTickets(url, hidden, { bucket, columnFilters, refreshNonce })

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
      const { [TICKET_TABLE_ALERT_COLUMN_ID]: _alert, ...widths } = next
      dispatch({ type: 'set_widths', columnWidths: widths })
      debouncedPatch({
        columnWidths: Object.keys(widths).length > 0 ? widths : undefined
      })
    },
    [columnSizing, debouncedPatch]
  )

  const tableColumns = useMemo(
    () =>
      buildTicketsColumns(columns, {
        settings,
        columnFilters,
        url,
        onColumnFiltersChange: showSkeleton ? undefined : handleFiltersChange,
        hasUnread
      }),
    [columns, settings, columnFilters, url, handleFiltersChange, showSkeleton, hasUnread]
  )

  const tableOptions = useMemo(
    () => ({
      features: pierreTableFeatures,
      data,
      columns: tableColumns,
      getRowId: (row: TicketRow) => getTicketId(row) ?? String(row.id_reclamation ?? ''),
      enableColumnResizing: true,
      columnResizeMode: 'onEnd' as const,
      onSortingChange: setSorting,
      onColumnVisibilityChange: handleColumnVisibilityChange,
      onColumnOrderChange: handleColumnOrderChange,
      onColumnSizingChange: handleColumnSizingChange,
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
      handleColumnVisibilityChange,
      handleColumnOrderChange,
      handleColumnSizingChange,
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

  const total = meta?.total ?? 0
  const rangeStart = total === 0 ? 0 : offset + 1
  const rangeEnd = offset + data.length
  const paginationLabel = showSkeleton
    ? '—'
    : total === 0
      ? '0 réclamation'
      : `${rangeStart}–${rangeEnd} sur ${total}`

  const hasActiveFilters = hasActiveColumnFilters(columnFilters)

  if (hidden) return null

  return (
    <BoardTableSection
      title={title}
      metadata={[paginationLabel]}
      actions={
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <TicketsColumnVisibilityMenu
            columns={menuColumns}
            settings={settings}
            hiddenColumns={hiddenColumns}
            onHiddenChange={handleHiddenChange}
            triggerClassName={buttonVariants({
              variant: 'outline',
              size: 'sm'
            })}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasActiveFilters || showSkeleton}
            onClick={handleClearAllFilters}
          >
            <FilterX data-icon="inline-start" />
            Effacer les filtres
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            disabled={loading}
          >
            <RefreshCw data-icon="inline-start" className={cn(loading && 'animate-spin')} />
            Actualiser
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={showSkeleton || !canPrevPage}
          >
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={showSkeleton || !canNextPage}
          >
            Suivant
          </Button>
        </div>
      }
    >
      {error ? <p className="text-muted-foreground px-4 py-2 text-sm">{error}</p> : null}

      {showSkeleton ? (
        <TicketsTableSkeleton columns={SKELETON_TICKET_COLUMNS} settings={settings} />
      ) : (
        <BoardDualTable
          headerGroups={headerGroups}
          leafHeaders={leafHeaders}
          rows={tableRows}
          scrollRef={scrollRef}
          emptyMessage="Aucune réclamation importée."
          renderRow={(row, { index, measureRef }) => (
            <TableRow
              key={row.id}
              data-index={index}
              ref={measureRef}
              data-state={row.id === selectedId ? 'selected' : undefined}
              className="cursor-pointer"
              onClick={() => onRowClick(row.original as TicketRow)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="max-w-0 overflow-hidden text-start">
                  <div className="truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          )}
        />
      )}
    </BoardTableSection>
  )
})
