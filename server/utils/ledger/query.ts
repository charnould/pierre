import { Database } from 'bun:sqlite'

import { latest_repayment_states } from '../activities/repayment'
import { datastorePaths } from '../paths'
import { sql_date_key } from '../sql-normalization'
import {
  build_filters,
  build_output_column_set,
  normalize_facet_value,
  parse_sort,
  resolve_sort,
  validate_filters
} from './filters'
import {
  COMPTES_LOCATAIRES_TABLE,
  CONTACTS_TABLE,
  CORE_COMPTES_LOCATAIRES_COLUMNS,
  DEFAULT_LEDGER_SORT,
  LOTS_TABLE,
  MAX_LEDGER_FACET_DISTINCT_VALUES,
  MAX_LEDGER_FACET_SEARCH_RESULTS,
  LedgerQueryError,
  LedgerSchemaError,
  build_ledger_output_column_meta,
  type LedgerColumnMeta,
  type LedgerFacetsInput,
  type LedgerFacetsResult,
  type LedgerListInput,
  type LedgerListResult,
  type LedgerMovementsResult
} from './schema'
import { build_ledger_view_sql, non_empty_locataire } from './view'

const empty_meta = (
  limit: number,
  offset: number,
  movement_column_list?: LedgerColumnMeta[]
): LedgerListResult['meta'] => ({
  total: 0,
  limit,
  offset,
  snapshot_date: null,
  columns: build_ledger_output_column_meta(movement_column_list ?? []),
  default_sort: DEFAULT_LEDGER_SORT,
  gestionnaire_assignable: true
})

const table_exists = (db: Database, name: string): boolean =>
  db
    .query<{ n: number }, [string]>(
      "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name=?"
    )
    .get(name)!.n > 0

const get_table_columns = (db: Database, table: string): LedgerColumnMeta[] =>
  db
    .query<{ name: string; type: string }, []>(`PRAGMA table_info("${table}")`)
    .all()
    .map(({ name, type }) => ({ name, type }))

/**
 * Pierre may assign a gestionnaire when the SI column is unused:
 * table missing, column missing, or every row is NULL/empty.
 */
export const is_gestionnaire_assignable = (db: Database): boolean => {
  if (!table_exists(db, COMPTES_LOCATAIRES_TABLE)) return true
  const columns = get_table_columns(db, COMPTES_LOCATAIRES_TABLE)
  if (!columns.some((column) => column.name === 'gestionnaire')) return true
  const row = db
    .query<{ n: number }, []>(
      `SELECT COUNT(*) AS n FROM "${COMPTES_LOCATAIRES_TABLE}"
       WHERE "gestionnaire" IS NOT NULL AND TRIM(CAST("gestionnaire" AS TEXT)) != ''`
    )
    .get()
  return (row?.n ?? 0) === 0
}

const assert_core_comptes_locataires_columns = (columns: LedgerColumnMeta[]): void => {
  const names = new Set(columns.map((c) => c.name))
  for (const core of CORE_COMPTES_LOCATAIRES_COLUMNS) {
    if (!names.has(core)) {
      throw new LedgerSchemaError(`missing required column: ${core}`)
    }
  }
}

const read_snapshot_date = (db: Database, movement_columns: Set<string>): string | null => {
  if (!movement_columns.has('date_extraction')) return null
  const row = db
    .query<{ snapshot_date: string | null }, []>(
      `SELECT "date_extraction" AS snapshot_date
       FROM "${COMPTES_LOCATAIRES_TABLE}"
       WHERE "date_extraction" IS NOT NULL
       ORDER BY ${sql_date_key('"date_extraction"')} DESC, rowid DESC
       LIMIT 1`
    )
    .get()
  return row?.snapshot_date ?? null
}

const strip_internal_columns = (rows: Record<string, unknown>[]): Record<string, unknown>[] =>
  rows.map((row) => {
    const rest = { ...row }
    delete rest['_ledger_total']
    return rest
  })

/**
 * Lists tenant balances aggregated by `id_locataire` from `comptes_locataires`.
 * Occupation / bail from `lots_locatifs` on (id_lot, id_locataire); rent from id_lot.
 */
export const list_ledger_balances = (input: LedgerListInput): LedgerListResult => {
  const db = new Database(datastorePaths().database, { readonly: true })

  try {
    if (!table_exists(db, COMPTES_LOCATAIRES_TABLE)) {
      return { data: [], meta: empty_meta(input.limit, input.offset) }
    }

    const movement_column_list = get_table_columns(db, COMPTES_LOCATAIRES_TABLE)
    const movement_columns = new Set(movement_column_list.map((c) => c.name))
    assert_core_comptes_locataires_columns(movement_column_list)
    const gestionnaire_assignable = is_gestionnaire_assignable(db)

    const output_column_meta = build_ledger_output_column_meta(movement_column_list)
    const output_columns = build_output_column_set(output_column_meta)

    validate_filters(input.filters, output_columns)
    const sort = resolve_sort(input.sort, output_columns)
    const { where, params } = build_filters(input.filters)
    const { column, direction } = parse_sort(sort)

    const has_lots = table_exists(db, LOTS_TABLE)
    const lots_columns = has_lots
      ? new Set(get_table_columns(db, LOTS_TABLE).map((c) => c.name))
      : new Set<string>()
    const has_contacts = table_exists(db, CONTACTS_TABLE)
    const view_sql = build_ledger_view_sql(
      movement_column_list,
      has_lots,
      lots_columns,
      has_contacts
    )
    const snapshot_date = read_snapshot_date(db, movement_columns)

    const rows = db
      .query<Record<string, unknown>, (string | number)[]>(
        `SELECT ledger.*, COUNT(*) OVER() AS _ledger_total
         FROM (${view_sql}) ledger
         ${where}
         ORDER BY "${column}" ${direction}, "id_locataire" ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, input.limit, input.offset)

    const total =
      rows.length > 0 ? Number(rows[0]!['_ledger_total']) : input.offset === 0 ? 0 : undefined

    const stripped = strip_internal_columns(rows)
    const tenantIds = stripped
      .map((row) => String(row['id_locataire'] ?? '').trim())
      .filter(Boolean)
    const activityStates = latest_repayment_states(db, tenantIds)
    const data = stripped.map((row) => {
      const tenantId = String(row['id_locataire'] ?? '').trim()
      const state = activityStates.get(tenantId)
      const pierreGestionnaire = state?.gestionnaire?.trim() || null
      return {
        ...row,
        ...(pierreGestionnaire ? { gestionnaire: pierreGestionnaire } : {}),
        bucket: state?.bucket ?? 'non_traites',
        derniere_action_realisee: state?.derniere_action_realisee ?? null,
        date_derniere_action_realisee: state?.date_derniere_action_realisee ?? null
      }
    })

    const metaBase = {
      limit: input.limit,
      offset: input.offset,
      snapshot_date,
      columns: output_column_meta,
      default_sort: DEFAULT_LEDGER_SORT,
      gestionnaire_assignable
    }

    if (total === undefined) {
      const count_row = db
        .query<{ n: number }, string[]>(`SELECT COUNT(*) as n FROM (${view_sql}) ledger ${where}`)
        .get(...params)!
      return {
        data,
        meta: {
          total: count_row.n,
          ...metaBase
        }
      }
    }

    return {
      data,
      meta: {
        total,
        ...metaBase
      }
    }
  } finally {
    db.close()
  }
}

/**
 * Returns distinct values for a ledger view column (full dataset, not paginated).
 */
export const get_ledger_column_facets = (input: LedgerFacetsInput): LedgerFacetsResult => {
  const db = new Database(datastorePaths().database, { readonly: true })

  try {
    if (!table_exists(db, COMPTES_LOCATAIRES_TABLE)) {
      return {
        column: input.column,
        values: [],
        total: 0,
        filterable: true
      }
    }

    const movement_column_list = get_table_columns(db, COMPTES_LOCATAIRES_TABLE)
    assert_core_comptes_locataires_columns(movement_column_list)

    const output_column_meta = build_ledger_output_column_meta(movement_column_list)
    const filterable_columns = build_output_column_set(output_column_meta)

    if (!filterable_columns.has(input.column)) {
      throw new LedgerQueryError('invalid filter column')
    }

    const has_lots = table_exists(db, LOTS_TABLE)
    const lots_columns = has_lots
      ? new Set(get_table_columns(db, LOTS_TABLE).map((c) => c.name))
      : new Set<string>()
    const has_contacts = table_exists(db, CONTACTS_TABLE)
    const view_sql = build_ledger_view_sql(
      movement_column_list,
      has_lots,
      lots_columns,
      has_contacts
    )

    const total =
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(DISTINCT "${input.column}") as n FROM (${view_sql}) ledger`
        )
        .get()?.n ?? 0

    const filterable = total <= MAX_LEDGER_FACET_DISTINCT_VALUES
    const q = input.q?.trim()

    if (!filterable && !q) {
      return { column: input.column, values: [], total, filterable: false }
    }

    const where = q
      ? `WHERE "${input.column}" IS NOT NULL AND LOWER(CAST("${input.column}" AS TEXT)) LIKE LOWER(?)`
      : ''
    const params = q ? [`${q}%`] : []
    const limitClause = !filterable ? ` LIMIT ${MAX_LEDGER_FACET_SEARCH_RESULTS}` : ''

    const rows = db
      .query<{ value: unknown }, string[]>(
        `SELECT DISTINCT "${input.column}" as value FROM (${view_sql}) ledger ${where} ORDER BY "${input.column}" ASC${limitClause}`
      )
      .all(...params)

    const values = rows.map(({ value }) => normalize_facet_value(value))
    return { column: input.column, values, total, filterable }
  } finally {
    db.close()
  }
}

const build_movement_order_clause = (movement_columns: Set<string>): string => {
  if (movement_columns.has('date_exigibilite')) {
    return `${sql_date_key('"date_exigibilite"')} DESC, rowid DESC`
  }
  return 'rowid DESC'
}

/**
 * Lists all financial movements for a single `id_locataire`, newest first.
 */
export const list_ledger_movements = (id_locataire: string): LedgerMovementsResult => {
  const db = new Database(datastorePaths().database, { readonly: true })

  try {
    if (!table_exists(db, COMPTES_LOCATAIRES_TABLE)) {
      return { data: [], meta: { total: 0, snapshot_date: null } }
    }

    const movement_column_list = get_table_columns(db, COMPTES_LOCATAIRES_TABLE)
    const movement_columns = new Set(movement_column_list.map((c) => c.name))
    assert_core_comptes_locataires_columns(movement_column_list)

    const snapshot_date = read_snapshot_date(db, movement_columns)
    const order_clause = build_movement_order_clause(movement_columns)
    const selected = movement_column_list.map((column) => `"${column.name}"`).join(', ')

    const rows = db
      .query<Record<string, unknown>, [string]>(
        `SELECT ${selected}
         FROM "${COMPTES_LOCATAIRES_TABLE}"
         WHERE ${non_empty_locataire} AND "id_locataire" = ?
         ORDER BY ${order_clause}`
      )
      .all(id_locataire)

    return {
      data: rows,
      meta: {
        total: rows.length,
        snapshot_date
      }
    }
  } finally {
    db.close()
  }
}
