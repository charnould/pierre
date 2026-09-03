import {
  DEFAULT_LEDGER_SORT,
  RESERVED_LEDGER_QUERY_PARAMS,
  LedgerQueryError,
  type LedgerColumnMeta
} from './schema'

export const build_output_column_set = (columns: LedgerColumnMeta[]): Set<string> =>
  new Set(columns.map((column) => column.name))

export const parse_sort = (sort: string): { column: string; direction: 'ASC' | 'DESC' } => {
  const desc = sort.startsWith('-')
  const column = desc ? sort.slice(1) : sort
  if (!column) throw new LedgerQueryError('invalid sort column')
  return { column, direction: desc ? 'DESC' : 'ASC' }
}

export const resolve_sort = (sort: string | undefined, columns: Set<string>): string => {
  const resolved = sort ?? DEFAULT_LEDGER_SORT
  if (!columns.has(parse_sort(resolved).column)) throw new LedgerQueryError('invalid sort column')
  return resolved
}

export const validate_filters = (filters: Record<string, string[]>, columns: Set<string>): void => {
  for (const key of Object.keys(filters)) {
    if (!columns.has(key)) throw new LedgerQueryError('invalid filter column')
    if (!Array.isArray(filters[key]) || filters[key].length === 0) {
      throw new LedgerQueryError('invalid filter value')
    }
  }
}

export const build_filters = (
  filters: Record<string, string[]>
): { where: string; params: string[] } => {
  const conditions: string[] = []
  const params: string[] = []
  for (const [column, values] of Object.entries(filters)) {
    conditions.push(
      values.length === 1
        ? `"${column}" = ?`
        : `"${column}" IN (${values.map(() => '?').join(', ')})`
    )
    params.push(...values)
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params }
}

export const normalize_facet_value = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '' : String(value)

export const parse_ledger_filters = (
  params: URLSearchParams,
  reserved = new Set<string>(RESERVED_LEDGER_QUERY_PARAMS)
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
