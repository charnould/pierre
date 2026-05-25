import type {
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  Updater
} from '@tanstack/react-table'
import { FilterX, MessageSquarePlus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import { Button } from '@/shared/components/ui/button'
import { Card, CardBody } from '@/shared/components/ui/card'
import { DataTable } from '@/shared/components/ui/data-table'
import { useDebouncedTablePatch } from '@/shared/hooks/useDebouncedTablePatch'
import { useTickets } from '@/shared/hooks/useTickets'
import type { TicketsTableSettings } from '@/shared/lib/ui-settings/schema'
import {
  areColumnFiltersEqual,
  clearAllColumnFilters,
  hasActiveColumnFilters,
  hiddenColumnsToColumnVisibility,
  mergeFullColumnOrder,
  resolveColumnOrder,
  resolvePinnedColumns,
  resolveUnpinnedColumnOrder,
  resolveVisibleColumnNames,
  sanitizeColumnFilters,
  stripTicketTableSystemColumns,
  stripTicketTableDraftColumnWidths,
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

import '@/features/tickets/styles/tickets-table.css'
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
  return typeof updater === 'function' ? updater(previous) : updater
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

const DOCK_BTN_CLASS =
  'tickets-dock-btn text-tickets-chrome-fg hover:text-foreground inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all hover:bg-foreground/6 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30'

export function TicketsTableView({
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

  const resolvedFullOrder = useMemo(
    () => resolveColumnOrder(schemaNames, columnOrder.length > 0 ? columnOrder : undefined),
    [schemaNames, columnOrder]
  )

  const columnVisibility = useMemo(
    () => hiddenColumnsToColumnVisibility(schemaNames, hiddenColumns),
    [schemaNames, hiddenColumns]
  )

  const visibleOrderedNames = useMemo(
    () => resolveVisibleColumnNames(schemaNames, { columnOrder: resolvedFullOrder, hiddenColumns }),
    [schemaNames, resolvedFullOrder, hiddenColumns]
  )

  const pinnedLeft = useMemo(() => {
    const dataPins = resolvePinnedColumns(visibleOrderedNames, pinnedColumns)
    return [
      TICKET_TABLE_DRAFT_GROUP_ID,
      ...dataPins.filter((id) => id !== TICKET_TABLE_DRAFT_GROUP_ID)
    ]
  }, [visibleOrderedNames, pinnedColumns])

  const unpinnedColumnOrder = useMemo(
    () => resolveUnpinnedColumnOrder(resolvedFullOrder, pinnedLeft),
    [resolvedFullOrder, pinnedLeft]
  )

  const columnPinning = useMemo<ColumnPinningState>(
    () => ({ left: pinnedLeft, right: [] }),
    [pinnedLeft]
  )

  const persistFullColumnOrder = useCallback(
    (pinned: string[], unpinned: string[]) => {
      const pinnedData = stripTicketTableSystemColumns(pinned)
      const unpinnedData = stripTicketTableSystemColumns(unpinned)
      const nextForSettings = mergeFullColumnOrder(pinnedData, unpinnedData)
      dispatch({ type: 'set_column_order', columnOrder: nextForSettings })
      debouncedPatch({ columnOrder: nextForSettings })
    },
    [debouncedPatch]
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

  const handlePinnedChange = useCallback(
    (next: string[]) => {
      dispatch({ type: 'set_pinned', pinnedColumns: next })
      debouncedPatch({ pinnedColumns: next })
    },
    [debouncedPatch]
  )

  const handleColumnSizingChange = useCallback(
    (updater: Updater<ColumnSizingState>) => {
      const next = stripTicketTableDraftColumnWidths(applyUpdater(updater, columnWidths))
      dispatch({ type: 'set_widths', columnWidths: next })
      debouncedPatch({
        columnWidths: Object.keys(next).length > 0 ? next : undefined
      })
    },
    [columnWidths, debouncedPatch]
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
      const nextUnpinned = applyUpdater(updater, unpinnedColumnOrder)
      persistFullColumnOrder(pinnedLeft, nextUnpinned)
    },
    [persistFullColumnOrder, pinnedLeft, unpinnedColumnOrder]
  )

  const handleColumnPinningChange = useCallback(
    (updater: Updater<ColumnPinningState>) => {
      const nextPinning = applyUpdater(updater, columnPinning)
      const nextPinned = stripTicketTableSystemColumns(nextPinning.left ?? [])
      persistFullColumnOrder(nextPinned, unpinnedColumnOrder)
    },
    [columnPinning, persistFullColumnOrder, unpinnedColumnOrder]
  )

  const tableColumnSizing = useMemo(
    () => ({ ...columnWidths, ...ticketTableDraftColumnSizing() }),
    [columnWidths]
  )

  const tableColumns = useMemo(
    () =>
      buildTicketsColumns(columns, {
        settings,
        columnFilters,
        url,
        enableColumnDnD: !showSkeleton,
        onColumnFiltersChange: showSkeleton ? undefined : handleFiltersChange,
        onDraftIconClick: showSkeleton ? undefined : onDraftIconClick
      }),
    [columns, settings, columnFilters, url, handleFiltersChange, showSkeleton, onDraftIconClick]
  )

  const total = meta?.total ?? 0
  const rangeStart = total === 0 ? 0 : offset + 1
  const rangeEnd = offset + data.length
  const paginationLabel = showSkeleton
    ? '—'
    : total === 0
      ? ''
      : `${rangeStart}–${rangeEnd} sur ${total}`

  const hasActiveFilters = hasActiveColumnFilters(columnFilters)

  if (hidden) return null

  return (
    <div className="desk-form-panel">
      <Card variant="chrome">
        <CardBody inset="chrome" className="tickets-table-body">
          {error ? (
            <div className="border-border text-muted-foreground shrink-0 border-b px-4 py-2 text-sm">
              {error}
            </div>
          ) : null}

          {showSkeleton ? (
            <TicketsTableSkeleton columns={SKELETON_TICKET_COLUMNS} settings={settings} />
          ) : (
            <DataTable
              columns={tableColumns}
              data={data}
              paginate={false}
              showToolbar={false}
              flush
              dense
              lockedColumnIds={[TICKET_TABLE_DRAFT_GROUP_ID]}
              columnPinning={columnPinning}
              onColumnPinningChange={handleColumnPinningChange}
              columnOrder={unpinnedColumnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              enableColumnResizing
              columnResizeMode="onEnd"
              enableColumnDnD
              columnSizing={tableColumnSizing}
              onColumnSizingChange={handleColumnSizingChange}
              onRowClick={onRowClick}
              contentClassName="tickets-data-table pb-20"
              emptyMessage="Aucune réclamation importée."
            />
          )}

          <div className="app-floating-dock-fade" aria-hidden />

          <div className="desk-table-dock pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4">
            <div className="app-floating-dock-wrap pointer-events-auto">
              <div className="app-floating-dock flex max-w-full items-center gap-0.5 overflow-x-auto px-3 py-1.5">
                <TicketsColumnVisibilityMenu
                  columns={menuColumns}
                  settings={settings}
                  hiddenColumns={hiddenColumns}
                  pinnedColumns={pinnedColumns}
                  onHiddenChange={handleHiddenChange}
                  onPinnedChange={handlePinnedChange}
                  triggerClassName={DOCK_BTN_CLASS}
                />

                <Button
                  type="button"
                  size="sm"
                  className="tickets-dock-cta h-8 shrink-0 rounded-md px-3.5"
                  onClick={onOpenManualMessage}
                >
                  <MessageSquarePlus className="size-3.5" strokeWidth={2} />
                  Répondre à un message
                </Button>

                {hasActiveFilters && !showSkeleton ? (
                  <button type="button" onClick={handleClearAllFilters} className={DOCK_BTN_CLASS}>
                    <FilterX className="size-3.5" />
                    Effacer les filtres
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void reload()}
                  disabled={loading}
                  className={DOCK_BTN_CLASS}
                >
                  <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                  Actualiser
                </button>

                <div className="bg-border/50 mx-1 hidden h-5 w-px shrink-0 sm:block" aria-hidden />

                <div className="flex shrink-0 items-center gap-0.5">
                  {paginationLabel ? (
                    <p className="text-tickets-chrome-fg px-2 text-sm font-medium whitespace-nowrap tabular-nums">
                      {paginationLabel}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={prevPage}
                    disabled={showSkeleton || !canPrevPage}
                    className={DOCK_BTN_CLASS}
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={nextPage}
                    disabled={showSkeleton || !canNextPage}
                    className={DOCK_BTN_CLASS}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
