import createDOMPurify, { type Config, type DOMPurify } from 'dompurify'

export type MarkdownSanitizeProfile = 'prose' | 'auto-report'

const SANITIZE_PROFILES: Record<MarkdownSanitizeProfile, Config> = {
  prose: {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel']
  },
  'auto-report': {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: ['target', 'rel', 'data-callout', 'align'],
    ADD_TAGS: ['figure', 'figcaption']
  }
}

let purify: DOMPurify | null = null

function domPurify(): DOMPurify {
  if (purify) return purify
  if (typeof window === 'undefined') {
    throw new Error('DOMPurify requires a DOM window')
  }
  purify = createDOMPurify(window)
  return purify
}

export function sanitizeMarkdownHtml(html: string, profile: MarkdownSanitizeProfile): string {
  return domPurify().sanitize(html, SANITIZE_PROFILES[profile])
}
