import type { ActiviteListItem } from '@/shared/types/activites'

export const ACTIVITY_PAGE_SIZE = 50

export function refreshWindowLimit(loadedCount: number): number {
  return Math.max(ACTIVITY_PAGE_SIZE, loadedCount)
}

export function appendUniqueActivityRows(
  previous: ActiviteListItem[],
  incoming: ActiviteListItem[]
): ActiviteListItem[] {
  if (incoming.length === 0) return previous
  const seen = new Set(previous.map((row) => row.id))
  const extra = incoming.filter((row) => !seen.has(row.id))
  return extra.length === 0 ? previous : [...previous, ...extra]
}

export function pageIsFull(receivedCount: number, requestedLimit: number): boolean {
  return requestedLimit > 0 && receivedCount >= requestedLimit
}
