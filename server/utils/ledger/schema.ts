import { z } from 'zod'

import { CONTACTS_TABLE } from '../contacts'

export const CORE_COMPTES_LOCATAIRES_COLUMNS = [
  'id_client',
  'id_locataire',
  'montant_en_euros'
] as const

export const COMPTES_LOCATAIRES_TABLE = 'comptes_locataires'
export const LOTS_TABLE = 'lots_locatifs'
export { CONTACTS_TABLE }

export const DEFAULT_LEDGER_SORT = '-solde_locataire'

export const RESERVED_LEDGER_QUERY_PARAMS = ['limit', 'offset', 'sort', 'column', 'q'] as const

export type LedgerColumnMeta = { name: string; type: string }

export const LedgerPaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(10_000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.string().trim().min(1).optional()
})

export type LedgerPaginationQuery = z.infer<typeof LedgerPaginationQuery>

export type LedgerListInput = LedgerPaginationQuery & {
  filters: Record<string, string[]>
}

export type LedgerFacetsInput = {
  column: string
  q?: string
}

export const MAX_LEDGER_FACET_DISTINCT_VALUES = 99
export const MAX_LEDGER_FACET_SEARCH_RESULTS = 50

export type LedgerFacetsResult = {
  column: string
  values: string[]
  total: number
  filterable: boolean
}

export type LedgerListResult = {
  data: Record<string, unknown>[]
  meta: {
    total: number
    limit: number
    offset: number
    snapshot_date: string | null
    columns: LedgerColumnMeta[]
    default_sort: string
    /** True when CSV `gestionnaire` is unused (missing column or 100% null/empty). */
    gestionnaire_assignable: boolean
  }
}

export type LedgerMovementsResult = {
  data: Record<string, unknown>[]
  meta: {
    total: number
    snapshot_date: string | null
  }
}

export class LedgerQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerQueryError'
  }
}

export class LedgerSchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerSchemaError'
  }
}

export const COMPUTED_LEDGER_COLUMNS = new Set([
  'solde_locataire',
  'statut',
  'ratio_dette_loyer',
  'email_status',
  'telephone_status',
  'debut_bail',
  'fin_bail'
])

/** API column manifest: computed fields + every `comptes_locataires` column (latest movement). */
export const build_ledger_output_column_meta = (
  movement_column_list: LedgerColumnMeta[]
): LedgerColumnMeta[] => {
  const id_locataire =
    movement_column_list.find((column) => column.name === 'id_locataire') ??
    ({ name: 'id_locataire', type: 'TEXT' } satisfies LedgerColumnMeta)
  const movement_rest = movement_column_list.filter(
    (column) => column.name !== 'id_locataire' && !COMPUTED_LEDGER_COLUMNS.has(column.name)
  )

  return [
    id_locataire,
    { name: 'solde_locataire', type: 'REAL' },
    { name: 'statut', type: 'TEXT' },
    { name: 'ratio_dette_loyer', type: 'REAL' },
    { name: 'email_status', type: 'TEXT' },
    { name: 'telephone_status', type: 'TEXT' },
    { name: 'debut_bail', type: 'TEXT' },
    { name: 'fin_bail', type: 'TEXT' },
    ...movement_rest
  ]
}
