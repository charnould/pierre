import type { ColumnSizingState } from '@tanstack/react-table'

import type { LedgerColumnMeta } from '@/shared/types/ledger'

const REPAYMENT_UI_COLUMN_IDS = [
  'alertes',
  'bucket',
  'derniere_action_realisee',
  'date_derniere_action_realisee'
] as const

export type RepaymentUiColumnId = (typeof REPAYMENT_UI_COLUMN_IDS)[number]

/** Column ids = UI columns + ledger field names from `meta.columns`. */
export type RepaymentColumnId = RepaymentUiColumnId | (string & {})

export const LOCKED_REPAYMENT_COLUMN_IDS = [
  'alertes'
] as const satisfies readonly RepaymentUiColumnId[]

/** Never shown in tables or the Colonnes menu. */
const ALWAYS_HIDDEN_REPAYMENT_COLUMN_IDS = ['bucket', 'statut', 'evolution_solde'] as const

export const DEFAULT_LEDGER_COLUMN_WIDTH = 120

export const DEFAULT_REPAYMENT_COLUMN_SIZING: ColumnSizingState = {
  alertes: 40,
  bucket: 160,
  derniere_action_realisee: 200,
  date_derniere_action_realisee: 120,
  solde_locataire: 96,
  ratio_dette_loyer: 148,
  gestionnaire: 160
}

const UI_COLUMN_ID_SET = new Set<string>(REPAYMENT_UI_COLUMN_IDS)
const LOCKED_COLUMN_ID_SET = new Set<string>(LOCKED_REPAYMENT_COLUMN_IDS)
const ALWAYS_HIDDEN_COLUMN_ID_SET = new Set<string>(ALWAYS_HIDDEN_REPAYMENT_COLUMN_IDS)

const NUMERIC_REPAYMENT_COLUMN_IDS = new Set([
  'solde_locataire',
  'montant_en_euros',
  'ratio_dette_loyer'
])

export function isRepaymentUiColumnId(id: string): id is RepaymentUiColumnId {
  return UI_COLUMN_ID_SET.has(id)
}

export function isRepaymentNumericColumn(id: string): boolean {
  return NUMERIC_REPAYMENT_COLUMN_IDS.has(id)
}

export function isRepaymentColumnId(
  id: string,
  ledgerColumnIds: readonly string[] = []
): id is RepaymentColumnId {
  return isRepaymentUiColumnId(id) || ledgerColumnIds.includes(id)
}

export function ledgerColumnIdsFromMeta(meta: LedgerColumnMeta[] | undefined): string[] {
  return meta?.map((column) => column.name) ?? []
}

export function resolveRepaymentTableColumnIds(ledgerColumnIds: readonly string[]): string[] {
  const ordered: string[] = [...LOCKED_REPAYMENT_COLUMN_IDS]
  for (const id of REPAYMENT_UI_COLUMN_IDS) {
    if (LOCKED_COLUMN_ID_SET.has(id)) continue
    if (ALWAYS_HIDDEN_COLUMN_ID_SET.has(id)) continue
    if (!ordered.includes(id)) ordered.push(id)
  }
  for (const id of ledgerColumnIds) {
    if (ALWAYS_HIDDEN_COLUMN_ID_SET.has(id)) continue
    if (!ordered.includes(id)) ordered.push(id)
  }
  return ordered
}

export function pinLockedRepaymentColumns(
  order: readonly string[],
  activeColumnIds?: readonly string[]
): string[] {
  const activeSet = activeColumnIds ? new Set(activeColumnIds) : null
  const locked = [...LOCKED_REPAYMENT_COLUMN_IDS]
  const rest = order.filter(
    (id) =>
      !LOCKED_COLUMN_ID_SET.has(id) &&
      (activeSet == null || activeSet.has(id) || isRepaymentUiColumnId(id))
  )
  return [...locked, ...rest]
}

export function togglableRepaymentColumnIds(activeColumnIds: readonly string[]): string[] {
  return activeColumnIds.filter(
    (id) => !LOCKED_COLUMN_ID_SET.has(id) && !ALWAYS_HIDDEN_COLUMN_ID_SET.has(id)
  )
}

export function defaultRepaymentColumnSizing(
  ledgerColumnIds: readonly string[]
): ColumnSizingState {
  const sizing: ColumnSizingState = { ...DEFAULT_REPAYMENT_COLUMN_SIZING }
  for (const id of ledgerColumnIds) {
    if (sizing[id] == null) sizing[id] = DEFAULT_LEDGER_COLUMN_WIDTH
  }
  return sizing
}
