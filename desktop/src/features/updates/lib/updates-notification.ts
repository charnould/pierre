import type { UpdateEntry } from '@/features/updates/types'
import type { UpdatesNotifyScope } from '@/shared/types/settings'

export function filterEntriesByScope(
  entries: UpdateEntry[],
  scope: UpdatesNotifyScope
): UpdateEntry[] {
  if (scope === 'off') return []
  return entries
}

export function resolveUpdatesReadSlugs(readSlugs: string[] | undefined): string[] {
  return readSlugs ?? []
}

export function isUpdateEntryUnread(readSlugs: string[] | undefined, entry: UpdateEntry): boolean {
  if (!readSlugs?.length) return true
  return !readSlugs.includes(entry.slug)
}

export function markEntryRead(readSlugs: string[] | undefined, slug: string): string[] {
  if (readSlugs?.includes(slug)) return readSlugs
  return [...(readSlugs ?? []), slug]
}

export function markEntryUnread(readSlugs: string[] | undefined, slug: string): string[] {
  if (!readSlugs?.includes(slug)) return readSlugs ?? []
  return readSlugs.filter((entry) => entry !== slug)
}

export function markScopeRead(
  entries: UpdateEntry[],
  scope: UpdatesNotifyScope,
  readSlugs: string[] | undefined
): string[] {
  const relevant = filterEntriesByScope(entries, scope)
  if (relevant.length === 0) return readSlugs ?? []
  const next = new Set(readSlugs ?? [])
  for (const entry of relevant) next.add(entry.slug)
  return [...next]
}

export function countUnread(
  entries: UpdateEntry[],
  scope: UpdatesNotifyScope,
  readSlugs: string[] | undefined
): number {
  const relevant = filterEntriesByScope(entries, scope)
  if (relevant.length === 0) return 0
  return relevant.filter((entry) => isUpdateEntryUnread(readSlugs, entry)).length
}

export function latestUnreadEntry(
  entries: UpdateEntry[],
  scope: UpdatesNotifyScope,
  readSlugs: string[] | undefined
): UpdateEntry | null {
  const relevant = filterEntriesByScope(entries, scope)
  return relevant.find((entry) => isUpdateEntryUnread(readSlugs, entry)) ?? null
}
