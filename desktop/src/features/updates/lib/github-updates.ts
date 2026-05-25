import type { UpdateEntry } from '@/features/updates/types'

import { resolveMarkdownImages } from './resolve-markdown-images'
import { stripFrontmatter, stripLeadingH1 } from './strip-frontmatter'
import { updateMarkdownUrl, updatesIndexUrl } from './updates-urls'

export {
  updateAssetUrl,
  updateGitHubWebUrl,
  updateMarkdownUrl,
  updatesIndexUrl,
  UPDATES_GITHUB_BASE
} from './updates-urls'

const indexCache = {
  value: null as UpdateEntry[] | null,
  promise: null as Promise<UpdateEntry[]> | null
}
const markdownCache = new Map<string, string>()

function isUpdateEntry(value: unknown): value is UpdateEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.slug === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.date === 'string' &&
    typeof entry.audience === 'string'
  )
}

export function parseUpdatesIndex(raw: unknown): UpdateEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isUpdateEntry)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function clearUpdatesCache(): void {
  indexCache.value = null
  indexCache.promise = null
  markdownCache.clear()
}

async function fetchText(url: string): Promise<string> {
  if (typeof window !== 'undefined' && window.api?.fetchUrl) {
    const text = await window.api.fetchUrl(url)
    if (text === null) throw new Error('fetch_failed')
    return text
  }

  const response = await fetch(url)
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
    const entries = parseUpdatesIndex(JSON.parse(text) as unknown)
    indexCache.value = entries
    return entries
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

  const raw = await fetchText(updateMarkdownUrl(slug))
  const markdown = resolveMarkdownImages(stripLeadingH1(stripFrontmatter(raw)), slug)
  markdownCache.set(slug, markdown)
  return markdown
}
