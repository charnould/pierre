import type { TicketsColumnMeta } from './tickets-query'

export type CompareOperator = 'gt' | 'gte' | 'lt' | 'lte'

export type TicketFilterRule =
  | { kind: 'values'; column: string; values: string[] }
  | { kind: 'compare'; column: string; operator: CompareOperator; value: string }

export type PartitionedFilterRules = {
  valid: TicketFilterRule[]
  orphaned: TicketFilterRule[]
}

const COMPARE_SQL: Record<CompareOperator, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<='
}

const isNonEmptyRule = (rule: TicketFilterRule): boolean => {
  if (rule.kind === 'values') return rule.values.length > 0
  return rule.value.trim().length > 0
}

/** Splits rules against current `reclamations` column names (runtime introspection). */
export const partitionFilterRules = (
  rules: TicketFilterRule[],
  columnNames: Iterable<string>
): PartitionedFilterRules => {
  const allowed = new Set(columnNames)
  const valid: TicketFilterRule[] = []
  const orphaned: TicketFilterRule[] = []

  for (const rule of rules) {
    if (!isNonEmptyRule(rule)) continue
    if (!allowed.has(rule.column)) {
      orphaned.push(rule)
      continue
    }
    valid.push(rule)
  }

  return { valid, orphaned }
}

/** Builds a SQLite WHERE clause from rules valid for the given column names. */
export const buildTicketFiltersWhere = (
  rules: TicketFilterRule[],
  columnNames: Iterable<string>
): { where: string; params: string[] } => {
  const { valid } = partitionFilterRules(rules, columnNames)
  const conditions: string[] = []
  const params: string[] = []

  for (const rule of valid) {
    if (rule.kind === 'values') {
      if (rule.values.length === 1) {
        conditions.push(`"${rule.column}" = ?`)
        params.push(rule.values[0]!)
      } else {
        conditions.push(`"${rule.column}" IN (${rule.values.map(() => '?').join(', ')})`)
        params.push(...rule.values)
      }
    } else {
      conditions.push(`"${rule.column}" ${COMPARE_SQL[rule.operator]} ?`)
      params.push(rule.value.trim())
    }
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  }
}

/** UI hint: prefer comparison operators for date-like columns. */
export const suggestCompareForColumn = (column: TicketsColumnMeta): boolean => {
  const name = column.name.toLowerCase()
  const type = column.type.toUpperCase()
  if (type === 'DATE' || type === 'DATETIME') return true
  if (name.startsWith('date_')) return true
  return false
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseCompareOperator = (value: unknown): CompareOperator | null => {
  if (value === 'gt' || value === 'gte' || value === 'lt' || value === 'lte') return value
  return null
}

/** Parses JSON filter rules from API query param. Invalid entries are dropped. */
export const parseTicketFilterRules = (raw: unknown): TicketFilterRule[] => {
  if (!Array.isArray(raw)) return []
  const rules: TicketFilterRule[] = []

  for (const item of raw) {
    if (!isRecord(item) || typeof item.column !== 'string' || !item.column.trim()) continue
    const column = item.column.trim()

    if (item.kind === 'values' && Array.isArray(item.values)) {
      const values = item.values.filter((v): v is string => typeof v === 'string' && v.length > 0)
      if (values.length > 0) rules.push({ kind: 'values', column, values })
      continue
    }

    if (item.kind === 'compare' && typeof item.value === 'string') {
      const operator = parseCompareOperator(item.operator)
      if (operator && item.value.trim()) {
        rules.push({ kind: 'compare', column, operator, value: item.value.trim() })
      }
    }
  }

  return rules
}
