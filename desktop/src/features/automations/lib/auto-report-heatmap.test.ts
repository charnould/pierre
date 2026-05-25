import { describe, expect, it } from 'bun:test'

import { tryRenderHeatmapPlot } from './auto-report-heatmap'

describe('auto-report-heatmap', () => {
  it('renders a css grid heatmap without svg', () => {
    const spec = {
      type: 'heatmap',
      data: [
        { jour: 1, mois: 'Jan', activite: 10 },
        { jour: 2, mois: 'Jan', activite: 80 },
        { jour: 1, mois: 'Fév', activite: 45 }
      ],
      x: 'jour',
      y: 'mois',
      fill: 'activite',
      caption: 'Calendrier test'
    }

    const html = tryRenderHeatmapPlot(JSON.stringify(spec), spec)
    expect(html).toContain('auto-report-heatmap__cell')
    expect(html).toContain('--heatmap-cols:2')
    expect(html).toContain('--heatmap-rows:2')
    expect(html).not.toContain('<svg')
    expect(html).toContain('<figcaption>Calendrier test</figcaption>')
  })
})
