import { Database } from 'bun:sqlite'

import { z } from 'zod'

import { datastorePaths } from './paths'
import { draft_summaries_by_ticket } from './ticket-activities'
import { buildTicketFiltersWhere, type TicketFilterRule } from './ticket-filters'

export const CORE_RECLAMATION_COLUMNS = ['id_reclamation', 'id_locataire', 'id_lot'] as const

export const DEFAULT_TICKETS_SORT = '-id_reclamation'

const RESERVED_TICKETS_QUERY_PARAMS = ['limit', 'offset', 'sort', 'rules'] as const

export type TicketsColumnMeta = { name: string; type: string }

export const TicketsPaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.string().trim().min(1).optional()
})

export type TicketsPaginationQuery = z.infer<typeof TicketsPaginationQuery>

export type TicketsListInput = TicketsPaginationQuery & {
  filters: Record<string, string[]>
  filter_rules?: TicketFilterRule[]
}

export type TicketsFacetsInput = {
  column: string
  q?: string
}

const MAX_COLUMN_FILTER_DISTINCT_VALUES = 99
const MAX_COLUMN_FACET_SEARCH_RESULTS = 50

export type TicketsFacetsResult = {
  column: string
  values: string[]
  /** Full-table COUNT(DISTINCT column), independent of search `q`. */
  total: number
  filterable: boolean
}

export type TicketsListResult = {
  data: Record<string, unknown>[]
  meta: {
    total: number
    limit: number
    offset: number
    columns: TicketsColumnMeta[]
    default_sort: string
  }
}

export class TicketsQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketsQueryError'
  }
}

export class TicketsSchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketsSchemaError'
  }
}

const datastore_path = (): string => datastorePaths().database

const empty_meta = (
  limit: number,
  offset: number,
  columns: TicketsColumnMeta[] = []
): TicketsListResult['meta'] => ({
  total: 0,
  limit,
  offset,
  columns,
  default_sort: DEFAULT_TICKETS_SORT
})

const table_exists = (db: Database): boolean =>
  db
    .query<{ n: number }, []>(
      "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='reclamations'"
    )
    .get()!.n > 0

const get_table_columns = (db: Database): TicketsColumnMeta[] =>
  db
    .query<{ name: string; type: string }, []>('PRAGMA table_info("reclamations")')
    .all()
    .map(({ name, type }) => ({ name, type }))

const assert_core_columns = (columns: TicketsColumnMeta[]): void => {
  const names = new Set(columns.map((c) => c.name))
  for (const core of CORE_RECLAMATION_COLUMNS) {
    if (!names.has(core)) {
      throw new TicketsSchemaError(`missing required column: ${core}`)
    }
  }
}

const column_names = (columns: TicketsColumnMeta[]): Set<string> =>
  new Set(columns.map((c) => c.name))

const parse_sort = (sort: string): { column: string; direction: 'ASC' | 'DESC' } => {
  const desc = sort.startsWith('-')
  const column = desc ? sort.slice(1) : sort
  if (!column) throw new TicketsQueryError('invalid sort column')
  return { column, direction: desc ? 'DESC' : 'ASC' }
}

const resolve_sort = (sort: string | undefined, names: Set<string>): string => {
  const resolved = sort ?? DEFAULT_TICKETS_SORT
  const { column } = parse_sort(resolved)
  if (!names.has(column)) {
    throw new TicketsQueryError('invalid sort column')
  }
  return resolved
}

const validate_filters = (filters: Record<string, string[]>, names: Set<string>): void => {
  for (const key of Object.keys(filters)) {
    if (!names.has(key)) {
      throw new TicketsQueryError('invalid filter column')
    }
    if (!Array.isArray(filters[key]) || filters[key].length === 0) {
      throw new TicketsQueryError('invalid filter value')
    }
  }
}

const build_filters = (filters: Record<string, string[]>): { where: string; params: string[] } => {
  const conditions: string[] = []
  const params: string[] = []

  for (const [column, values] of Object.entries(filters)) {
    if (values.length === 1) {
      conditions.push(`"${column}" = ?`)
      params.push(values[0]!)
    } else {
      conditions.push(`"${column}" IN (${values.map(() => '?').join(', ')})`)
      params.push(...values)
    }
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  }
}

const merge_where_clauses = (
  columnFilters: { where: string; params: string[] },
  rules: { where: string; params: string[] }
): { where: string; params: string[] } => {
  const filtersCond = columnFilters.where.replace(/^WHERE\s+/i, '')
  const rulesCond = rules.where.replace(/^WHERE\s+/i, '')
  const conditions = [filtersCond, rulesCond].filter((c) => c.length > 0)
  if (conditions.length === 0) return { where: '', params: [] }
  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    params: [...columnFilters.params, ...rules.params]
  }
}

const normalize_facet_value = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

/** Parse repeated query params into multi-value filters. */
export const parse_tickets_filters = (
  params: URLSearchParams,
  reserved = new Set<string>(RESERVED_TICKETS_QUERY_PARAMS)
): Record<string, string[]> => {
  const filters: Record<string, string[]> = {}
  for (const [key, value] of params.entries()) {
    if (reserved.has(key)) continue
    const trimmed = value.trim()
    if (!trimmed) continue
    if (!filters[key]) filters[key] = []
    filters[key].push(trimmed)
  }
  return filters
}

/**
 * Lists tickets from `datastore.sqlite` with optional filters and pagination.
 * Column names for filters and sort are validated against `PRAGMA table_info("reclamations")`.
 */
export const list_tickets = (input: TicketsListInput): TicketsListResult => {
  const db = new Database(datastore_path(), { readonly: true })

  try {
    if (!table_exists(db)) {
      return { data: [], meta: empty_meta(input.limit, input.offset) }
    }

    const columns = get_table_columns(db)
    assert_core_columns(columns)
    const names = column_names(columns)

    validate_filters(input.filters, names)
    const sort = resolve_sort(input.sort, names)
    const filtersWhere = build_filters(input.filters)
    const rulesWhere =
      input.filter_rules && input.filter_rules.length > 0
        ? buildTicketFiltersWhere(input.filter_rules, names)
        : { where: '', params: [] as string[] }
    const { where, params } = merge_where_clauses(filtersWhere, rulesWhere)
    const { column, direction } = parse_sort(sort)

    const total = db
      .query<{ n: number }, string[]>(`SELECT COUNT(*) as n FROM reclamations ${where}`)
      .get(...params)!.n

    const rows = db
      .query<Record<string, unknown>, (string | number)[]>(
        `SELECT * FROM reclamations ${where} ORDER BY "${column}" ${direction} LIMIT ? OFFSET ?`
      )
      .all(...params, input.limit, input.offset)

    const ticket_ids = rows
      .map((row) => {
        const v = row['id_reclamation']
        if (v === null || v === undefined || v === '') return ''
        return String(v).trim()
      })
      .filter((id) => id.length > 0)

    const summaries = draft_summaries_by_ticket(ticket_ids)

    const data = rows.map((row) => {
      const id = String(row['id_reclamation'] ?? '').trim()
      const summary = summaries.get(id)
      return {
        ...row,
        draft_id_skills: summary?.id_skills ?? [],
        ...(summary?.answer_channel ? { draft_answer_channel: summary.answer_channel } : {}),
        ...(summary?.automation_skills?.length
          ? { draft_automation_skills: summary.automation_skills }
          : {}),
        ...(summary?.latest_at ? { draft_latest_at: summary.latest_at } : {}),
        ...(summary?.generated_by ? { draft_generated_by: summary.generated_by } : {}),
        ...(summary?.edited_by ? { draft_edited_by: summary.edited_by } : {}),
        draft_markers: summary?.markers ?? []
      }
    })

    return {
      data,
      meta: {
        total,
        limit: input.limit,
        offset: input.offset,
        columns,
        default_sort: DEFAULT_TICKETS_SORT
      }
    }
  } finally {
    db.close()
  }
}

/**
 * Returns distinct values for a tickets column (full table, not paginated).
 */
export const get_ticket_column_facets = (input: TicketsFacetsInput): TicketsFacetsResult => {
  const db = new Database(datastore_path(), { readonly: true })

  try {
    if (!table_exists(db)) {
      return {
        column: input.column,
        values: [],
        total: 0,
        filterable: true
      }
    }

    const columns = get_table_columns(db)
    assert_core_columns(columns)
    const names = column_names(columns)

    if (!names.has(input.column)) {
      throw new TicketsQueryError('invalid filter column')
    }

    const total =
      db
        .query<{ n: number }, []>(`SELECT COUNT(DISTINCT "${input.column}") as n FROM reclamations`)
        .get()?.n ?? 0

    const filterable = total <= MAX_COLUMN_FILTER_DISTINCT_VALUES
    const q = input.q?.trim()

    if (!filterable && !q) {
      return { column: input.column, values: [], total, filterable: false }
    }

    const where = q
      ? `WHERE "${input.column}" IS NOT NULL AND LOWER(CAST("${input.column}" AS TEXT)) LIKE LOWER(?)`
      : ''
    const params = q ? [`${q}%`] : []
    const limitClause = !filterable ? ` LIMIT ${MAX_COLUMN_FACET_SEARCH_RESULTS}` : ''

    const rows = db
      .query<{ value: unknown }, string[]>(
        `SELECT DISTINCT "${input.column}" as value FROM reclamations ${where} ORDER BY "${input.column}" ASC${limitClause}`
      )
      .all(...params)

    const values = rows.map(({ value }) => normalize_facet_value(value))
    return { column: input.column, values, total, filterable }
  } finally {
    db.close()
  }
}
