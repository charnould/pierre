import type { UiSettings } from '@/shared/lib/ui-settings/schema'
import { resolveTicketColumnLabel } from '@/shared/lib/ui-settings/schema'

import type { TicketAutomationFilters, TicketFilterRule } from '../lib/automation-types'
import { COMPARE_OPERATOR_LABELS } from '../lib/ticket-filters-client'

function formatRuleLabel(rule: TicketFilterRule, settings?: UiSettings): string {
  const label = resolveTicketColumnLabel(rule.column, settings)
  if (rule.kind === 'values') {
    const values = rule.values.map((v) => (v === '' ? '(vide)' : v)).join(', ')
    return `${label} : ${values}`
  }
  const op = COMPARE_OPERATOR_LABELS[rule.operator]
  const date = new Date(rule.value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return `${label} ${op} ${date}`
}

const HIDDEN_FILTER_COLUMNS = new Set(['type_affaire', 'avancement'])

function visibleTicketFilterRules(rules: TicketFilterRule[]): TicketFilterRule[] {
  return rules.filter((rule) => !HIDDEN_FILTER_COLUMNS.has(rule.column))
}

export function formatTicketFilters(
  filters: TicketAutomationFilters,
  settings?: UiSettings
): string {
  const visibleRules = visibleTicketFilterRules(filters.rules)
  if (visibleRules.length === 0) return 'Aucun filtre'
  return visibleRules.map((rule) => formatRuleLabel(rule, settings)).join(' · ')
}
