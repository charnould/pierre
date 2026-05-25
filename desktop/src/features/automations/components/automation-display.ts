import type { UiSettings } from '@/shared/lib/ui-settings/schema'
import { resolveTicketColumnLabel } from '@/shared/lib/ui-settings/schema'

import type { Automation, TicketAutomationFilters, TicketFilterRule } from '../lib/automation-types'
import { COMPARE_OPERATOR_LABELS } from '../lib/ticket-filters-client'

export type { Automation, AutomationStatus } from '../lib/automation-types'
export { isReportAutomation, isTicketReplyAutomation } from '../lib/automation-types'

export function extractReportTitle(report: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(report.trim())
  return match?.[1].trim() ?? fallback
}

export function runDisplayStatus(automation: Automation, isLatest: boolean): Automation['status'] {
  if (!isLatest) return 'success'
  if (automation.status === 'error') return 'error'
  if (automation.status === 'running') return 'running'
  return 'success'
}

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

export function formatTicketFilters(
  filters: TicketAutomationFilters,
  settings?: UiSettings
): string {
  if (filters.rules.length === 0) return 'Aucun filtre'
  return filters.rules.map((r) => formatRuleLabel(r, settings)).join(' · ')
}

export function countOrphanedRules(rules: TicketFilterRule[], columnNames: string[]): number {
  const allowed = new Set(columnNames)
  return rules.filter((r) => !allowed.has(r.column)).length
}
