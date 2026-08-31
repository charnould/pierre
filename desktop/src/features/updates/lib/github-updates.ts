import type { UpdateEntry } from '@/features/updates/types'

import { resolveMarkdownImages } from './resolve-markdown-images'
import { stripFrontmatter, stripLeadingH1 } from './strip-frontmatter'
import {
  getChangelogFolder,
  resetChangelogFolder,
  setChangelogFolder,
  updateMarkdownUrl,
  updatesIndexUrl,
  UPDATES_CHANGELOG_FOLDER
} from './updates-urls'

const indexCache = {
  value: null as UpdateEntry[] | null,
  promise: null as Promise<UpdateEntry[]> | null
}
const markdownCache = new Map<string, string>()

export type ParsedUpdatesToc = {
  folder: string | null
  entries: UpdateEntry[]
}

function isUpdateEntry(value: unknown): value is UpdateEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.slug === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.date === 'string'
  )
}

function stripOrder(name: string) {
  return name.replace(/^\d{1,2}-/, '')
}

function sortEntries(entries: UpdateEntry[]): UpdateEntry[] {
  return entries.slice().sort((a, b) => b.date.localeCompare(a.date))
}

/** Parse docs/toc.json — locate the changelog section and its `entries`. */
export function parseUpdatesToc(raw: unknown): ParsedUpdatesToc {
  if (!Array.isArray(raw)) return { folder: null, entries: [] }

  for (const section of raw) {
    if (!section || typeof section !== 'object') continue
    const folder = (section as { folder?: unknown }).folder
    if (typeof folder !== 'string') continue
    if (folder !== UPDATES_CHANGELOG_FOLDER && stripOrder(folder) !== 'changelog') continue
    const entriesRaw = (section as { entries?: unknown }).entries
    const entries = Array.isArray(entriesRaw) ? sortEntries(entriesRaw.filter(isUpdateEntry)) : []
    return { folder, entries }
  }

  return { folder: null, entries: [] }
}

export function clearUpdatesCache(): void {
  indexCache.value = null
  indexCache.promise = null
  markdownCache.clear()
  resetChangelogFolder()
}

async function fetchText(url: string): Promise<string> {
  if (typeof window !== 'undefined' && window.api?.fetchUrl) {
    const text = await window.api.fetchUrl(url)
    if (text === null) throw new Error('fetch_failed')
    return text
  }

  const headers: HeadersInit = url.includes('api.github.com')
    ? { Accept: 'application/vnd.github.raw', 'User-Agent': 'pierre-desktop' }
    : {}
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`fetch_failed:${response.status}`)
  }
  return response.text()
}

export async function fetchUpdatesIndex(options?: { force?: boolean }): Promise<UpdateEntry[]> {
  if (!options?.force && indexCache.value) return indexCache.value
  if (!options?.force && indexCache.promise) return indexCache.promise

  indexCache.promise = (async () => {
    const text = await fetchText(updatesIndexUrl())
    const parsed = parseUpdatesToc(JSON.parse(text) as unknown)
    setChangelogFolder(parsed.folder ?? UPDATES_CHANGELOG_FOLDER)
    indexCache.value = parsed.entries
    return parsed.entries
  })()

  try {
    return await indexCache.promise
  } finally {
    indexCache.promise = null
  }
}

export async function fetchUpdateMarkdown(
  slug: string,
  options?: { force?: boolean }
): Promise<string> {
  if (!options?.force && markdownCache.has(slug)) {
    return markdownCache.get(slug)!
  }

  const raw = await fetchText(updateMarkdownUrl(slug, getChangelogFolder()))
  const markdown = resolveMarkdownImages(stripLeadingH1(stripFrontmatter(raw)), slug)
  markdownCache.set(slug, markdown)
  return markdown
}
