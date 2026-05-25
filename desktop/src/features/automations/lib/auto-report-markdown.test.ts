import { beforeAll, describe, expect, it } from 'bun:test'

import { JSDOM } from 'jsdom'

import { calloutKindFromLabel, calloutKindFromMarkdownText } from './auto-report-callouts'
import { renderAutoReportMarkdownHtml } from './parse-auto-report-markdown'

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.SVGElement = dom.window.SVGElement
  }
})

describe('auto-report-callouts', () => {
  it('classifies rappel as info', () => {
    expect(calloutKindFromLabel('Rappel systématique')).toBe('info')
  })

  it('classifies urgent as danger', () => {
    expect(calloutKindFromMarkdownText('**Urgent — sécurité**')).toBe('danger')
  })
})

describe('parseAutoReportMarkdown', () => {
  it('renders semantic html without streamdown wrappers', () => {
    const html = renderAutoReportMarkdownHtml(`# Titre

> **Rappel :** texte

| A | B |
|---|---|
| 1 | 2 |
`)
    expect(html).toContain('<h1>Titre</h1>')
    expect(html).toContain('data-callout="info"')
    expect(html).toContain('auto-report-table-scroll')
    expect(html).not.toContain('data-streamdown')
  })

  it('renders plot blocks as inline svg figures', () => {
    const plotJson = JSON.stringify({
      type: 'barY',
      data: [
        { secteur: 'A', tickets: 2 },
        { secteur: 'B', tickets: 5 }
      ],
      x: 'secteur',
      y: 'tickets',
      caption: 'Test chart'
    })

    const html = renderAutoReportMarkdownHtml(`## Section\n\n\`\`\`plot\n${plotJson}\n\`\`\`\n`)
    expect(html).toContain('auto-report-chart--barY')
    expect(html).toContain('auto-report-chart-scroll')
    expect(html).toContain('<svg')
    expect(html).toContain('<figcaption>Test chart</figcaption>')
  })

  it('renders horizontal bar charts', () => {
    const plotJson = JSON.stringify({
      type: 'barX',
      data: [
        { action: 'A', count: 2 },
        { action: 'B', count: 1 }
      ],
      x: 'count',
      y: 'action'
    })

    const html = renderAutoReportMarkdownHtml(`\`\`\`plot\n${plotJson}\n\`\`\``)
    expect(html).toContain('auto-report-chart--barX')
    expect(html).toContain('<svg')
  })

  it('renders heatmap charts', () => {
    const plotJson = JSON.stringify({
      type: 'heatmap',
      data: [
        { jour: 'Lun', semaine: 'S1', appels: 2 },
        { jour: 'Mar', semaine: 'S1', appels: 5 },
        { jour: 'Lun', semaine: 'S2', appels: 1 },
        { jour: 'Mar', semaine: 'S2', appels: 3 }
      ],
      x: 'jour',
      y: 'semaine',
      fill: 'appels',
      caption: 'Heatmap test'
    })

    const html = renderAutoReportMarkdownHtml(`\`\`\`plot\n${plotJson}\n\`\`\``)
    expect(html).toContain('auto-report-chart--heatmap')
    expect(html).toContain('auto-report-heatmap__cell')
    expect(html).toContain('style="--cell:#')
    expect(html).toContain('auto-report-heatmap-legend')
    expect(html).not.toContain('fill="rgb(0, 0, 0)"')
    expect(html).toContain('<figcaption>Heatmap test</figcaption>')
  })

  it('renders sankey flow diagrams', () => {
    const plotJson = JSON.stringify({
      type: 'sankey',
      links: [
        { source: 'A', target: 'B', value: 2 },
        { source: 'A', target: 'C', value: 1 },
        { source: 'B', target: 'D', value: 2 },
        { source: 'C', target: 'D', value: 1 }
      ],
      caption: 'Flux test'
    })

    const html = renderAutoReportMarkdownHtml(`\`\`\`plot\n${plotJson}\n\`\`\``)
    expect(html).toContain('auto-report-chart--sankey')
    expect(html).toContain('sankey-links')
    expect(html).toContain('<figcaption>Flux test</figcaption>')
  })
})
