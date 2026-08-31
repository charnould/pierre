import type { MarkedExtension } from 'marked'

/** External links open in a new tab with safe rel attributes. */
export const markedExternalLinkRenderer: MarkedExtension = {
  renderer: {
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens)
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${label}</a>`
    }
  }
}
