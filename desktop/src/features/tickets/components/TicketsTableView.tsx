import {
  flexRender,
  useTable,
  type SortingState,
  type Updater,
  type ColumnSizingState
} from '@tanstack/react-table'
import { FilterX, MessageSquarePlus, RefreshCw } from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type UIEvent
} from 'react'

import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import type {
  AnyPierreHeader,
  AnyPierreRow
} from '@/shared/components/table/column-header-options-menu'
import { ColumnResizeHandle } from '@/shared/components/table/column-resize-handle'
import { pierreTableFeatures } from '@/shared/components/table/table-features'
import { VirtualizedTableBody } from '@/shared/components/table/VirtualizedTableBody'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
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
  ticketTableDraftColumnSizing,
  TICKET_TABLE_DRAFT_GROUP_ID,
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
  ticketsRefreshNonce?: number
  onDraftIconClick: (
    id_reclamation: string,
    format: TicketSkillKey,
    hasDraft: boolean,
    draft_id_skills?: string[],
    draft_answer_channel?: string | null
  ) => void
  onRowClick: (row: TicketRow) => void
  onOpenManualMessage: () => void
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

const titleType = 'font-sans text-xl leading-6 font-semibold tracking-tight text-balance'
const metaType =
  'shrink-0 font-sans text-xl leading-6 font-medium tracking-tight text-muted-foreground'

export const TicketsTableView = memo(function TicketsTableView({
  hidden,
  url,
  ticketsRefreshNonce,
  onDraftIconClick,
  onRowClick,
  onOpenManualMessage
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)
  const [chromeHeight, setChromeHeight] = useState(0)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return

    const sync = () => setChromeHeight(Math.ceil(el.getBoundingClientRect().height))
    sync()

    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
  } = useTickets(url, hidden, { columnFilters, refreshNonce: ticketsRefreshNonce })

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
      TICKET_TABLE_DRAFT_GROUP_ID,
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
      ...ticketTableDraftColumnSizing(),
      ...columnWidths
    }),
    [columnWidths]
  )

  const handleColumnSizingChange = useCallback(
    (updater: Updater<ColumnSizingState>) => {
      const next = applyUpdater(updater, columnSizing)
      if (columnSizingEqual(next, columnSizing)) return
      const { [TICKET_TABLE_DRAFT_GROUP_ID]: _draft, ...widths } = next
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
        onDraftIconClick: showSkeleton ? undefined : onDraftIconClick
      }),
    [columns, settings, columnFilters, url, handleFiltersChange, showSkeleton, onDraftIconClick]
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
  const tableRows = dataTable.getRowModel().rows as AnyPierreRow[]
  const headerGroups = dataTable.getHeaderGroups()
  const leafHeaders = headerGroups[0]?.headers ?? []
  const tableWidth = leafHeaders.reduce((sum, header) => sum + header.getSize(), 0)

  const total = meta?.total ?? 0
  const rangeStart = total === 0 ? 0 : offset + 1
  const rangeEnd = offset + data.length
  const paginationLabel = showSkeleton
    ? '—'
    : total === 0
      ? '0 réclamation'
      : `${rangeStart}–${rangeEnd} sur ${total}`

  const hasActiveFilters = hasActiveColumnFilters(columnFilters)

  const colgroup = () => (
    <colgroup>
      {leafHeaders.map((header) => (
        <col key={header.id} style={{ width: header.getSize() }} />
      ))}
    </colgroup>
  )

  if (hidden) return null

  return (
    <div
      ref={scrollRef}
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain"
      style={{ '--tickets-table-chrome-height': `${chromeHeight}px` } as CSSProperties}
    >
      <section className="bg-background flex w-full min-w-0 flex-col">
        <header
          ref={headerRef}
          className="border-border bg-background sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b py-2 ps-4 pe-2"
        >
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <h2 className={cn('m-0', titleType)}>Réclamations</h2>
            <span className={metaType} aria-hidden>
              ·
            </span>
            <span className={cn(metaType, 'tabular-nums')}>{paginationLabel}</span>
          </div>

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

            <Button type="button" variant="outline" size="sm" onClick={onOpenManualMessage}>
              <MessageSquarePlus data-icon="inline-start" />
              Répondre à un message
            </Button>

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
        </header>

        <div className="bg-background w-full min-w-0">
          {error ? <p className="text-muted-foreground px-4 py-2 text-sm">{error}</p> : null}

          {showSkeleton ? (
            <TicketsTableSkeleton columns={SKELETON_TICKET_COLUMNS} settings={settings} />
          ) : (
            <div className="relative w-full min-w-0">
              <div
                ref={headerScrollRef}
                onScroll={onHeaderScroll}
                className="bg-background sticky z-10 scrollbar-none overflow-x-auto"
                style={{ top: 'var(--tickets-table-chrome-height, 0px)' }}
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
                            className="border-border bg-background relative h-9 border-b px-2 text-start"
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
                    columnCount={tableColumns.length}
                    emptyMessage="Aucune réclamation importée."
                    renderRow={(row, { index, measureRef }) => (
                      <TableRow
                        key={row.id}
                        data-index={index}
                        ref={measureRef}
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
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
})
