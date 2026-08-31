import { useState } from 'react'

import { isGuestAccessibleTab, type Tab } from '@/shared/lib/tab-registry'

/** Same-reference when nothing changed — safe to call during render. */
export function nextVisitedTabs(
  visited: ReadonlySet<Tab>,
  activeTab: Tab,
  isLoggedIn: boolean
): ReadonlySet<Tab> {
  if (isLoggedIn) {
    if (visited.has(activeTab)) return visited
    const next = new Set(visited)
    next.add(activeTab)
    return next
  }

  const next = new Set<Tab>()
  for (const tab of visited) {
    if (isGuestAccessibleTab(tab)) next.add(tab)
  }
  if (isGuestAccessibleTab(activeTab)) next.add(activeTab)

  if (next.size === visited.size) {
    let same = true
    for (const tab of next) {
      if (!visited.has(tab)) {
        same = false
        break
      }
    }
    if (same) return visited
  }
  return next
}

export function useVisitedTabs(activeTab: Tab, isLoggedIn: boolean): ReadonlySet<Tab> {
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set([activeTab]))
  const next = nextVisitedTabs(visited, activeTab, isLoggedIn)
  if (next !== visited) setVisited(next)
  return next
}
