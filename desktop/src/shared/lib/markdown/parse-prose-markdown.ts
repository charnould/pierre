import { Marked } from 'marked'

import { markedExternalLinkRenderer } from '@/shared/lib/markdown/marked-external-link'
import { markedTypesetTableRenderer } from '@/shared/lib/markdown/marked-typeset-table'
import { sanitizeMarkdownHtml } from '@/shared/lib/markdown/sanitize-markdown-html'

export type ParseProseMarkdownOptions = {
  breaks?: boolean
}

function createProseMarked(breaks: boolean) {
  const marked = new Marked({ gfm: true, breaks })
  marked.use(markedExternalLinkRenderer, markedTypesetTableRenderer)
  return marked
}

const proseMarked = createProseMarked(false)
const chatMarked = createProseMarked(true)

export function renderProseMarkdownHtml(
  markdown: string,
  options?: ParseProseMarkdownOptions
): string {
  const parser = options?.breaks ? chatMarked : proseMarked
  return parser.parse(markdown) as string
}

/** Semantic HTML for typeset surfaces (Updates, About, etc.). */
export function parseProseMarkdown(markdown: string, options?: ParseProseMarkdownOptions): string {
  return sanitizeMarkdownHtml(renderProseMarkdownHtml(markdown, options), 'prose')
}
