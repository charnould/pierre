import {
  AUTOMATION_TYPE_LABELS,
  sameAutomationLogin,
  type Automation
} from '@/features/automations/lib/automation-types'
import { COLUMN_VALUE_COLOR_GROUPS } from '@/shared/lib/ui-settings/column-value-palette'
import {
  columnValueStyleToBadge,
  resolveColumnValueBadgeDefaults,
  type TicketValueDisplay
} from '@/shared/lib/ui-settings/tickets-table'

const BADGE_DEFAULTS = resolveColumnValueBadgeDefaults()

function paletteStyle(familyId: string) {
  const family = COLUMN_VALUE_COLOR_GROUPS.find((group) => group.id === familyId)
  return family?.variants[0]
}

export function collaboratorLogins(automation: Automation): string[] {
  return automation.mentions.filter(
    (login) => login && !sameAutomationLogin(login, automation.owner)
  )
}

export function accessText(automation: Automation): string {
  const count = collaboratorLogins(automation).length
  if (count === 0) return automation.owner
  const label = count === 1 ? 'personne' : 'personnes'
  return `${automation.owner} + ${count} ${label}`
}

export function formatGenerationDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function lastGenerationStatusLabel(automation: Automation): string {
  if (automation.lastRunStatus === 'success') return 'Succès'
  if (automation.lastRunStatus === 'error') return 'En échec'
  return '—'
}

export function runOutcomeDisplay(automation: Automation): TicketValueDisplay | null {
  const label = lastGenerationStatusLabel(automation)
  if (label === '—') return null
  const style = paletteStyle(automation.lastRunStatus === 'error' ? 'red' : 'green')
  if (!style) return { text: label }
  return {
    text: label,
    badgeStyle: columnValueStyleToBadge(style, BADGE_DEFAULTS)
  }
}

export function matchesAutomationSearch(automation: Automation, query: string): boolean {
  const haystack = [
    automation.name,
    automation.owner,
    automation.description ?? '',
    AUTOMATION_TYPE_LABELS[automation.type],
    ...automation.mentions
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}
