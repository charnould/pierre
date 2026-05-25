import { sankey, sankeyJustify, sankeyLinkHorizontal } from 'd3-sankey'

export interface SankeyLinkSpec {
  source: string
  target: string
  value: number
}

export interface SankeyPlotSpec {
  type: 'sankey'
  links: SankeyLinkSpec[]
  caption?: string
  title?: string
  width?: number
  height?: number
}

interface SankeyNodeDatum {
  name: string
  x0?: number
  x1?: number
  y0?: number
  y1?: number
  value?: number
}

interface SankeyLinkDatum {
  source: SankeyNodeDatum
  target: SankeyNodeDatum
  value: number
  width?: number
  y0?: number
  y1?: number
}

const NODE_FILL = [
  'color-mix(in oklch, var(--foreground) 72%, var(--card))',
  'color-mix(in oklch, var(--foreground) 58%, var(--card))',
  'color-mix(in oklch, var(--foreground) 44%, var(--card))'
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function nodeColumn(node: SankeyNodeDatum, nodes: SankeyNodeDatum[]): number {
  const xs = [...new Set(nodes.map((n) => n.x0 ?? 0))].sort((a, b) => a - b)
  return xs.indexOf(node.x0 ?? 0)
}

function nodeColor(column: number): string {
  return NODE_FILL[Math.min(column, NODE_FILL.length - 1)]
}

function isValidSankeySpec(spec: unknown): spec is SankeyPlotSpec {
  if (!spec || typeof spec !== 'object') return false
  const s = spec as SankeyPlotSpec
  if (s.type !== 'sankey' || !Array.isArray(s.links) || s.links.length === 0) return false
  return s.links.every(
    (link) =>
      typeof link.source === 'string' &&
      typeof link.target === 'string' &&
      typeof link.value === 'number' &&
      link.value > 0
  )
}

export function renderSankeyPlot(spec: SankeyPlotSpec): string {
  const width = spec.width ?? 680
  const height = spec.height ?? 300
  const margin = { top: 20, right: 108, bottom: 20, left: 12 }

  const nodeNames = new Set<string>()
  for (const link of spec.links) {
    nodeNames.add(link.source)
    nodeNames.add(link.target)
  }

  const nodes: SankeyNodeDatum[] = [...nodeNames].map((name) => ({ name }))
  const links = spec.links.map((link) => ({ ...link }))

  const layout = sankey<SankeyNodeDatum, SankeyLinkDatum>()
    .nodeId((d) => d.name)
    .nodeWidth(12)
    .nodePadding(14)
    .nodeAlign(sankeyJustify)
    .extent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom]
    ])

  const graph = layout({
    nodes: nodes.map((d) => ({ ...d })),
    links: links.map((d) => ({ ...d }))
  })

  const linkPath = sankeyLinkHorizontal()
  const maxValue = Math.max(...graph.links.map((l) => l.value))

  const linkSvg = graph.links
    .map((link) => {
      const opacity = 0.28 + (link.value / maxValue) * 0.42
      return `<path d="${linkPath(link) ?? ''}" fill="currentColor" fill-opacity="${opacity.toFixed(2)}" stroke="none"><title>${escapeAttr(`${link.source.name} → ${link.target.name} : ${link.value}`)}</title></path>`
    })
    .join('')

  const nodeSvg = graph.nodes
    .map((node) => {
      const col = nodeColumn(node, graph.nodes)
      const x = node.x0 ?? 0
      const y = node.y0 ?? 0
      const w = (node.x1 ?? 0) - x
      const h = (node.y1 ?? 0) - y
      const labelX = col === 0 ? x - 8 : (node.x1 ?? 0) + 8
      const anchor = col === 0 ? 'end' : 'start'
      const fill = nodeColor(col)

      return `<g class="sankey-node">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}"><title>${escapeAttr(`${node.name} : ${node.value ?? 0}`)}</title></rect>
  <text x="${labelX}" y="${y + h / 2}" dy="0.35em" text-anchor="${anchor}" font-family="Inter, system-ui, sans-serif" font-size="10" fill="currentColor">${escapeHtml(node.name)}</text>
</g>`
    })
    .join('')

  const title = spec.title
    ? `<text x="${margin.left}" y="12" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="currentColor">${escapeHtml(spec.title)}</text>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeAttr(spec.caption ?? 'Diagramme Sankey')}" style="display:block;background:transparent;color:var(--foreground,#1a1a1a);font-family:Inter,system-ui,sans-serif">
<style>
  .sankey-node text { pointer-events: none; }
</style>
${title}
<g class="sankey-links">${linkSvg}</g>
<g class="sankey-nodes">${nodeSvg}</g>
</svg>`

  const caption = spec.caption ? `<figcaption>${escapeHtml(spec.caption)}</figcaption>` : ''

  return `<figure class="auto-report-chart auto-report-chart--sankey"><div class="auto-report-chart-scroll">${svg}</div>${caption}</figure>\n`
}

export function tryRenderSankeyPlot(raw: string, parsed: unknown): string | null {
  if (!isValidSankeySpec(parsed)) return null
  try {
    return renderSankeyPlot(parsed)
  } catch {
    return null
  }
}
