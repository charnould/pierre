export type MarkdownSyncMode = 'skip' | 'full' | 'append'

export type MarkdownSyncPlan = {
  mode: MarkdownSyncMode
  delta?: string
}

/** Markdown syntax that requires a full Lexical re-parse when appended. */
const MARKDOWN_TRIGGER = /[#>*[`]|^\s*[-*+]\s|^\s*\d+\.\s|\*\*|__|`|^\s*#{1,6}\s/m

/**
 * Chooses how to sync streamed markdown into Lexical.
 * Plain suffixes can be appended; structural markdown triggers full convert.
 */
export function computeMarkdownSyncPlan(prev: string, next: string): MarkdownSyncPlan {
  if (next === prev) return { mode: 'skip' }
  if (!next.startsWith(prev)) return { mode: 'full' }
  const delta = next.slice(prev.length)
  if (!delta) return { mode: 'skip' }
  if (delta.includes('\n')) return { mode: 'full' }
  if (MARKDOWN_TRIGGER.test(delta)) return { mode: 'full' }
  return { mode: 'append', delta }
}
