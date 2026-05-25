/** Heatmap temporelle — HTML/CSS pur (sans Observable Plot). */

export interface HeatmapPlotSpec {
  type: 'heatmap'
  data: Record<string, unknown>[]
  x: string
  y: string
  fill?: string
  caption?: string
  title?: string
}

/** ColorBrewer YlOrRd — calé sur le bureau crème Pierre */
const HEATMAP_STOPS = [
  '#ffffe5',
  '#fff7bc',
  '#fee391',
  '#fec44f',
  '#fe9929',
  '#ec7014',
  '#cc4c02',
  '#993404',
  '#662506'
]
const HEATMAP_EMPTY = '#f0ebe3'
const HEATMAP_LEGEND_STOPS = HEATMAP_STOPS.join(', ')

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a)
  const [r2, g2, b2] = parseHex(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

function heatmapColor(value: number, min: number, max: number): string {
  if (!Number.isFinite(value)) return HEATMAP_EMPTY
  const span = max - min
  const t = span <= 0 ? 0 : (value - min) / span
  const clamped = Math.max(0, Math.min(1, t))
  const segment = clamped * (HEATMAP_STOPS.length - 1)
  const i = Math.min(HEATMAP_STOPS.length - 2, Math.floor(segment))
  return lerpHex(HEATMAP_STOPS[i], HEATMAP_STOPS[i + 1], segment - i)
}

function orderedCategories(data: Record<string, unknown>[], field: string): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const row of data) {
    const value = String(row[field] ?? '')
    if (!seen.has(value)) {
      seen.add(value)
      order.push(value)
    }
  }
  return order
}

function isHeatmapSpec(parsed: unknown): parsed is HeatmapPlotSpec {
  if (!parsed || typeof parsed !== 'object') return false
  const spec = parsed as HeatmapPlotSpec
  return (
    spec.type === 'heatmap' &&
    Array.isArray(spec.data) &&
    Boolean(spec.x && spec.y && (spec.fill ?? spec.y))
  )
}

function formatTickLabel(value: string, index: number, total: number): string {
  if (total <= 12) return value
  if (/^\d+$/.test(value)) {
    const n = Number(value)
    return n === 1 || n % 5 === 0 || n === total ? value : ''
  }
  return index === 0 || index === total - 1 || index % Math.ceil(total / 8) === 0 ? value : ''
}

export function tryRenderHeatmapPlot(raw: string, parsed: unknown): string | null {
  if (!isHeatmapSpec(parsed)) return null

  const fillKey = parsed.fill ?? parsed.y
  const xLabels = orderedCategories(parsed.data, parsed.x)
  const yLabels = orderedCategories(parsed.data, parsed.y)
  if (xLabels.length === 0 || yLabels.length === 0) return null

  const values = parsed.data.map((row) => Number(row[fillKey] ?? 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const valueMax = max === min ? min + 1 : max

  const valueByKey = new Map<string, number>()
  for (const row of parsed.data) {
    const x = String(row[parsed.x] ?? '')
    const y = String(row[parsed.y] ?? '')
    valueByKey.set(`${x}\0${y}`, Number(row[fillKey] ?? 0))
  }

  const xTicks = xLabels
    .map((label, index) => {
      const text = formatTickLabel(label, index, xLabels.length)
      return text
        ? `<span class="auto-report-heatmap__x-tick">${escapeHtml(text)}</span>`
        : '<span class="auto-report-heatmap__x-tick" aria-hidden="true"></span>'
    })
    .join('')

  const yTicks = yLabels
    .map((label) => `<span class="auto-report-heatmap__y-tick">${escapeHtml(label)}</span>`)
    .join('')

  const cells: string[] = []
  for (const y of yLabels) {
    for (const x of xLabels) {
      const value = valueByKey.get(`${x}\0${y}`)
      const color = value === undefined ? HEATMAP_EMPTY : heatmapColor(value, min, valueMax)
      const title =
        value === undefined
          ? `${y} · ${x}`
          : `${y} · ${x} · ${Number.isInteger(value) ? value : value.toFixed(1)}`
      cells.push(
        `<span class="auto-report-heatmap__cell" style="--cell:${color}" title="${escapeHtml(title)}"></span>`
      )
    }
  }

  const caption = parsed.caption ? `<figcaption>${escapeHtml(parsed.caption)}</figcaption>` : ''
  const title = parsed.title
    ? `<div class="auto-report-heatmap__title">${escapeHtml(parsed.title)}</div>`
    : ''

  return `<figure class="auto-report-chart auto-report-chart--heatmap"><div class="auto-report-chart-scroll"><div class="auto-report-heatmap" role="img" aria-label="Heatmap">${title}<div class="auto-report-heatmap__body" style="--heatmap-cols:${xLabels.length};--heatmap-rows:${yLabels.length}"><div class="auto-report-heatmap__y-axis">${yTicks}</div><div class="auto-report-heatmap__matrix"><div class="auto-report-heatmap__x-axis">${xTicks}</div><div class="auto-report-heatmap__cells">${cells.join('')}</div></div></div><div class="auto-report-heatmap-legend" aria-hidden="true"><span class="auto-report-heatmap-legend__bound">${escapeHtml(String(Math.round(min)))}</span><div class="auto-report-heatmap-legend__ramp" style="--heatmap-legend-stops:${HEATMAP_LEGEND_STOPS}"></div><span class="auto-report-heatmap-legend__bound">${escapeHtml(String(Math.round(valueMax)))}</span></div></div></div>${caption}</figure>\n`
}

export function heatmapPlotFallback(raw: string): string {
  return `<pre><code>${escapeHtml(raw)}</code></pre>\n`
}
