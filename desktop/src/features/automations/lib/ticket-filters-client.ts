import type { TicketFilterRule } from './automation-types'

export type PartitionedFilterRules = {
  valid: TicketFilterRule[]
  orphaned: TicketFilterRule[]
}

const isNonEmptyRule = (rule: TicketFilterRule): boolean => {
  if (rule.kind === 'values') return rule.values.length > 0
  return rule.value.trim().length > 0
}

/** Client-side partition against current column names from PRAGMA. */
export function partitionFilterRules(
  rules: TicketFilterRule[],
  columnNames: Iterable<string>
): PartitionedFilterRules {
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

export function suggestCompareForColumn(column: { name: string; type: string }): boolean {
  const name = column.name.toLowerCase()
  const type = column.type.toUpperCase()
  if (type === 'DATE' || type === 'DATETIME') return true
  if (name.startsWith('date_')) return true
  return false
}

export const COMPARE_OPERATOR_LABELS: Record<'gt' | 'gte' | 'lt' | 'lte', string> = {
  gt: 'est après',
  gte: 'est à partir du',
  lt: 'est avant',
  lte: "est jusqu'au"
}
