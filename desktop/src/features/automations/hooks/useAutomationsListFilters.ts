import { useMemo, useState } from 'react'

import { matchesAutomationSearch } from '@/features/automations/lib/automation-list-display'
import type { Automation } from '@/features/automations/lib/automation-types'
import {
  DEFAULT_AUTOMATION_SORT,
  sortAutomations,
  type AutomationSortKey
} from '@/features/automations/lib/sort-automations'

export function useAutomationsListFilters(automations: Automation[]) {
  const [sortKey, setSortKey] = useState<AutomationSortKey>(DEFAULT_AUTOMATION_SORT)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const filteredAutomations = useMemo(() => {
    if (!normalizedQuery) return automations
    return automations.filter((automation) => matchesAutomationSearch(automation, normalizedQuery))
  }, [automations, normalizedQuery])

  const sortedAutomations = useMemo(
    () => sortAutomations(filteredAutomations, sortKey),
    [filteredAutomations, sortKey]
  )

  return {
    query,
    setQuery,
    sortKey,
    setSortKey,
    normalizedQuery,
    sortedAutomations
  }
}
