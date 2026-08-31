import {
  AUTOMATION_TYPE_LABELS,
  type Automation
} from '@/features/automations/lib/automation-types'

export type AutomationSortKey =
  | 'last_run_desc'
  | 'last_run_asc'
  | 'owner_asc'
  | 'name_asc'
  | 'next_run_asc'
  | 'type_asc'

export const AUTOMATION_SORT_OPTIONS: { value: AutomationSortKey; label: string }[] = [
  { value: 'last_run_desc', label: 'Dernière génération (récent)' },
  { value: 'last_run_asc', label: 'Dernière génération (ancien)' },
  { value: 'next_run_asc', label: 'Prochaine exécution' },
  { value: 'owner_asc', label: 'Propriétaire (A→Z)' },
  { value: 'name_asc', label: 'Nom (A→Z)' },
  { value: 'type_asc', label: 'Type' }
]

export const DEFAULT_AUTOMATION_SORT: AutomationSortKey = 'last_run_desc'

function timeOrFallback(iso: string | undefined, fallback: number): number {
  if (!iso) return fallback
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : fallback
}

function compareLocale(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' })
}

function compareAutomations(a: Automation, b: Automation, sortKey: AutomationSortKey): number {
  switch (sortKey) {
    case 'last_run_desc': {
      const diff =
        timeOrFallback(b.lastRunDate, Number.NEGATIVE_INFINITY) -
        timeOrFallback(a.lastRunDate, Number.NEGATIVE_INFINITY)
      return diff !== 0 ? diff : compareLocale(a.name, b.name)
    }
    case 'last_run_asc': {
      const diff =
        timeOrFallback(a.lastRunDate, Number.POSITIVE_INFINITY) -
        timeOrFallback(b.lastRunDate, Number.POSITIVE_INFINITY)
      return diff !== 0 ? diff : compareLocale(a.name, b.name)
    }
    case 'next_run_asc': {
      const diff =
        timeOrFallback(a.nextRunDate, Number.POSITIVE_INFINITY) -
        timeOrFallback(b.nextRunDate, Number.POSITIVE_INFINITY)
      return diff !== 0 ? diff : compareLocale(a.name, b.name)
    }
    case 'owner_asc': {
      const diff = compareLocale(a.owner, b.owner)
      return diff !== 0 ? diff : compareLocale(a.name, b.name)
    }
    case 'name_asc':
      return compareLocale(a.name, b.name)
    case 'type_asc': {
      const diff = compareLocale(AUTOMATION_TYPE_LABELS[a.type], AUTOMATION_TYPE_LABELS[b.type])
      return diff !== 0 ? diff : compareLocale(a.name, b.name)
    }
    default:
      return 0
  }
}

export function sortAutomations(
  automations: Automation[],
  sortKey: AutomationSortKey
): Automation[] {
  return [...automations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return compareAutomations(a, b, sortKey)
  })
}
