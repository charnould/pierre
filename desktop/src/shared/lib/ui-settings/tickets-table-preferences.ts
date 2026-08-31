import type { ColumnVisibilityState } from '@/shared/lib/ui-settings/tickets-table'

import type { TicketsTableSettings } from './schema'
import {
  DEFAULT_PINNED_COLUMNS,
  columnVisibilityToHiddenColumns,
  type ColumnFilters
} from './tickets-table'

/** Local table preference state mirrored optimistically before persistence. */
export type TicketsTablePreferencesState = {
  columnOrder: string[]
  columnFilters: ColumnFilters
  hiddenColumns: string[]
  pinnedColumns: string[] | undefined
  columnWidths: Record<string, number>
}

export type TicketsTablePreferencesAction =
  | { type: 'sync_from_settings'; settings?: TicketsTableSettings }
  | { type: 'set_filters'; columnFilters: ColumnFilters }
  | { type: 'set_hidden'; hiddenColumns: string[] }
  | { type: 'set_pinned'; pinnedColumns: string[] }
  | { type: 'set_widths'; columnWidths: Record<string, number> }
  | { type: 'set_column_order'; columnOrder: string[] }
  | {
      type: 'set_visibility'
      schemaNames: string[]
      visibility: ColumnVisibilityState
    }

type ReconcileResult = {
  hiddenColumns: string[]
  pinnedColumns: string[] | undefined
  patch: Partial<TicketsTableSettings>
}

/**
 * Drops pinned columns that became hidden.
 */
export function reconcilePinnedWithHidden(
  hiddenColumns: string[],
  pinnedColumns: string[] | undefined
): { pinnedColumns: string[] | undefined; pinnedChanged: boolean } {
  const hiddenSet = new Set(hiddenColumns)
  const effectivePinned = pinnedColumns ?? [...DEFAULT_PINNED_COLUMNS]
  const nextPinned = effectivePinned.filter((name) => !hiddenSet.has(name))
  return {
    pinnedColumns: nextPinned,
    pinnedChanged: nextPinned.length !== effectivePinned.length
  }
}

/**
 * Builds the persistence patch for a hidden-column change (with pin reconciliation).
 */
export function buildHiddenColumnsPatch(
  hiddenColumns: string[],
  pinnedColumns: string[] | undefined
): Partial<TicketsTableSettings> {
  const { pinnedColumns: nextPinned, pinnedChanged } = reconcilePinnedWithHidden(
    hiddenColumns,
    pinnedColumns
  )

  const patch: Partial<TicketsTableSettings> = {
    hiddenColumns: hiddenColumns.length > 0 ? hiddenColumns : undefined
  }

  if (pinnedChanged) {
    patch.pinnedColumns = nextPinned
  }

  return patch
}

function stateFromSettings(settings?: TicketsTableSettings): TicketsTablePreferencesState {
  return {
    columnOrder: settings?.columnOrder ?? [],
    columnFilters: settings?.columnFilters ?? {},
    hiddenColumns: settings?.hiddenColumns ?? [],
    pinnedColumns: settings?.pinnedColumns,
    columnWidths: settings?.columnWidths ?? {}
  }
}

/**
 * Single reducer for tickets table UI preferences.
 */
export function ticketsTablePreferencesReducer(
  state: TicketsTablePreferencesState,
  action: TicketsTablePreferencesAction
): TicketsTablePreferencesState {
  switch (action.type) {
    case 'sync_from_settings':
      return stateFromSettings(action.settings)

    case 'set_filters':
      return { ...state, columnFilters: action.columnFilters }

    case 'set_hidden': {
      const { pinnedColumns } = reconcilePinnedWithHidden(action.hiddenColumns, state.pinnedColumns)
      return {
        ...state,
        hiddenColumns: action.hiddenColumns,
        pinnedColumns
      }
    }

    case 'set_pinned':
      return { ...state, pinnedColumns: action.pinnedColumns }

    case 'set_widths':
      return { ...state, columnWidths: action.columnWidths }

    case 'set_column_order':
      return { ...state, columnOrder: action.columnOrder }

    case 'set_visibility': {
      const nextHidden = columnVisibilityToHiddenColumns(action.schemaNames, action.visibility)
      const { pinnedColumns } = reconcilePinnedWithHidden(nextHidden, state.pinnedColumns)
      return {
        ...state,
        hiddenColumns: nextHidden,
        pinnedColumns
      }
    }

    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

/**
 * Patch payload to persist after a visibility change (hidden + optional pinned).
 */
export function patchForVisibilityChange(
  state: TicketsTablePreferencesState,
  schemaNames: string[],
  visibility: ColumnVisibilityState
): ReconcileResult {
  const hiddenColumns = columnVisibilityToHiddenColumns(schemaNames, visibility)
  const { pinnedColumns, pinnedChanged } = reconcilePinnedWithHidden(
    hiddenColumns,
    state.pinnedColumns
  )

  const patch = buildHiddenColumnsPatch(hiddenColumns, state.pinnedColumns)
  if (pinnedChanged) {
    patch.pinnedColumns = pinnedColumns
  }

  return { hiddenColumns, pinnedColumns, patch }
}

/**
 * Maps current preference state to a partial settings document for IPC patch.
 */
export function preferencesToPatch(
  state: TicketsTablePreferencesState,
  overrides: Partial<TicketsTableSettings> = {}
): Partial<TicketsTableSettings> {
  return {
    columnOrder: state.columnOrder.length > 0 ? state.columnOrder : undefined,
    columnFilters: Object.keys(state.columnFilters).length > 0 ? state.columnFilters : undefined,
    hiddenColumns: state.hiddenColumns.length > 0 ? state.hiddenColumns : undefined,
    pinnedColumns: state.pinnedColumns,
    columnWidths: Object.keys(state.columnWidths).length > 0 ? state.columnWidths : undefined,
    ...overrides
  }
}
