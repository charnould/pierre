import DOMPurify from 'dompurify'
import { Marked } from 'marked'

import { calloutKindFromMarkdownText } from './auto-report-callouts'
import { renderPlotBlock } from './auto-report-plot'

const autoReportMarked = new Marked({ gfm: true, breaks: false })

autoReportMarked.use({
  renderer: {
    blockquote({ tokens, text }) {
      const body = this.parser.parse(tokens)
      const kind = calloutKindFromMarkdownText(text)
      return `<blockquote data-callout="${kind}">${body}</blockquote>\n`
    },
    code({ text, lang }) {
      if (lang === 'plot') {
        return renderPlotBlock(text)
      }
      const langClass = lang ? ` class="language-${lang}"` : ''
      return `<pre><code${langClass}>${text}</code></pre>\n`
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens)
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${label}</a>`
    },
    table(token) {
      let headerCells = ''
      for (const cell of token.header) {
        headerCells += this.tablecell(cell)
      }
      const headerRow = this.tablerow({ text: headerCells })

      let body = ''
      for (const row of token.rows) {
        let rowCells = ''
        for (const cell of row) {
          rowCells += this.tablecell(cell)
        }
        body += this.tablerow({ text: rowCells })
      }
      if (body) body = `<tbody>${body}</tbody>`

      return `<div class="auto-report-table-scroll"><table>
<thead>
${headerRow}</thead>
${body}</table></div>\n`
    }
  }
})

export function renderAutoReportMarkdownHtml(markdown: string): string {
  return autoReportMarked.parse(markdown) as string
}

export function parseAutoReportMarkdown(markdown: string): string {
  const raw = renderAutoReportMarkdownHtml(markdown)
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: ['target', 'rel', 'data-callout', 'align'],
    ADD_TAGS: ['figure', 'figcaption']
  })
}
