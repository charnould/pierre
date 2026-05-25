import * as Plot from '@observablehq/plot'

import { tryRenderHeatmapPlot } from './auto-report-heatmap'
import { tryRenderSankeyPlot } from './auto-report-sankey'

type PlotType = 'barY' | 'barX' | 'lineY' | 'dot' | 'heatmap'

interface PlotBlockSpec {
  type: PlotType
  data: Record<string, unknown>[]
  x: string
  y: string
  fill?: string
  caption?: string
  title?: string
  width?: number
  height?: number
  /** Afficher la valeur sur / à côté de chaque barre (défaut : true pour barY/barX) */
  labels?: boolean
}

const PLOT_TYPES = new Set<PlotType>(['barY', 'barX', 'lineY', 'dot', 'heatmap'])

/** Tufte : une encre, pas de décoration. */
const INK = 'currentColor'

const PLOT_STYLE = {
  background: 'transparent',
  color: 'var(--foreground, #1a1a1a)',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '10px'
} as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function plotFallback(raw: string): string {
  return `<pre><code>${escapeHtml(raw)}</code></pre>\n`
}

function showLabels(spec: PlotBlockSpec): boolean {
  if (spec.labels === false) return false
  return spec.type === 'barY' || spec.type === 'barX'
}

function measureTextWidth(text: string, fontSize = 10): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.52
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return text.length * fontSize * 0.52
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
    return ctx.measureText(text).width
  } catch {
    return text.length * fontSize * 0.52
  }
}

function longestLabelWidth(spec: PlotBlockSpec, field: string): number {
  return Math.max(0, ...spec.data.map((d) => measureTextWidth(String(d[field] ?? ''))))
}

function barXLayout(spec: PlotBlockSpec, widthOverride?: number) {
  const labelWidth = longestLabelWidth(spec, spec.y)
  const marginLeft = Math.ceil(labelWidth) + 24
  const plotBody = 200
  const width = widthOverride ?? Math.max(480, marginLeft + plotBody + 48)

  return { width, marginLeft, marginRight: 48 }
}

function barYLayout(spec: PlotBlockSpec, widthOverride?: number) {
  const labelWidth = longestLabelWidth(spec, spec.x)
  const marginBottom = Math.max(36, Math.ceil(labelWidth / 3) + 28)

  return {
    width: widthOverride ?? 520,
    marginLeft: 36,
    marginRight: 12,
    marginBottom
  }
}

function valueLabel(spec: PlotBlockSpec, d: Record<string, unknown>): string {
  const key = spec.type === 'barX' ? spec.x : spec.y
  const value = d[key]
  return value == null ? '' : String(value)
}

function buildMarks(spec: PlotBlockSpec): Plot.Mark[] {
  const labels = showLabels(spec)

  switch (spec.type) {
    case 'barY': {
      const marks: Plot.Mark[] = [
        Plot.ruleY([0]),
        Plot.barY(spec.data, { x: spec.x, y: spec.y, fill: INK, fillOpacity: 0.82 })
      ]
      if (labels) {
        marks.push(
          Plot.text(spec.data, {
            x: spec.x,
            y: spec.y,
            text: (d) => valueLabel(spec, d),
            dy: -5,
            fill: INK,
            fontSize: 10
          })
        )
      }
      return marks
    }
    case 'barX': {
      const marks: Plot.Mark[] = [
        Plot.ruleX([0]),
        Plot.barX(spec.data, { x: spec.x, y: spec.y, fill: INK, fillOpacity: 0.82 })
      ]
      if (labels) {
        marks.push(
          Plot.text(spec.data, {
            x: spec.x,
            y: spec.y,
            text: (d) => valueLabel(spec, d),
            dx: 5,
            textAnchor: 'start',
            fill: INK,
            fontSize: 10
          })
        )
      }
      return marks
    }
    case 'lineY':
      return [
        Plot.ruleY([0]),
        Plot.lineY(spec.data, { x: spec.x, y: spec.y, stroke: INK, strokeWidth: 1.25 }),
        Plot.dot(spec.data, {
          x: spec.x,
          y: spec.y,
          fill: INK,
          r: 2.5,
          stroke: 'var(--card, #fff)',
          strokeWidth: 1
        })
      ]
    case 'dot':
      return [Plot.dot(spec.data, { x: spec.x, y: spec.y, fill: INK, r: 3 })]
    default:
      return []
  }
}

function buildPlotOptions(spec: PlotBlockSpec) {
  const marks = buildMarks(spec)
  if (marks.length === 0) return null

  const isHorizontal = spec.type === 'barX'
  const barX = isHorizontal ? barXLayout(spec, spec.width) : null
  const barY = spec.type === 'barY' ? barYLayout(spec, spec.width) : null
  const width = barX?.width ?? barY?.width ?? spec.width ?? 520
  const rowCount = isHorizontal ? spec.data.length : 0
  const rowHeight = 32

  return {
    document: typeof document !== 'undefined' ? document : undefined,
    title: spec.title,
    width,
    height: spec.height ?? (isHorizontal ? Math.max(96, rowCount * rowHeight + 24) : 160),
    marginLeft: barX?.marginLeft ?? barY?.marginLeft ?? 36,
    marginRight: barX?.marginRight ?? barY?.marginRight ?? 12,
    marginTop: 8,
    marginBottom: barY?.marginBottom ?? (isHorizontal ? 8 : 36),
    style: PLOT_STYLE,
    figure: false,
    x: {
      label: null,
      tickSize: 0,
      grid: spec.type === 'lineY',
      ...(spec.type === 'lineY' ? { gridOpacity: 0.12 } : {})
    },
    y: {
      label: null,
      tickSize: 0,
      grid: false,
      ...(isHorizontal ? { textAnchor: 'end' as const } : {})
    },
    marks
  }
}

export function renderPlotBlock(raw: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    return plotFallback(raw)
  }

  const heatmapHtml = tryRenderHeatmapPlot(raw, parsed)
  if (heatmapHtml) return heatmapHtml

  const sankeyHtml = tryRenderSankeyPlot(raw, parsed)
  if (sankeyHtml) return sankeyHtml

  const spec = parsed as PlotBlockSpec
  const hasAxes = Boolean(spec.x && spec.y)
  if (
    !PLOT_TYPES.has(spec.type) ||
    spec.type === 'heatmap' ||
    !Array.isArray(spec.data) ||
    !hasAxes
  ) {
    return plotFallback(raw)
  }

  const options = buildPlotOptions(spec)
  if (!options) return plotFallback(raw)

  try {
    const plot = Plot.plot(options)
    const caption = spec.caption ? `<figcaption>${escapeHtml(spec.caption)}</figcaption>` : ''
    const markup = plot.tagName.toLowerCase() === 'svg' ? plot.outerHTML : plot.innerHTML

    return `<figure class="auto-report-chart auto-report-chart--${spec.type}"><div class="auto-report-chart-scroll">${markup}</div>${caption}</figure>\n`
  } catch {
    return plotFallback(raw)
  }
}
