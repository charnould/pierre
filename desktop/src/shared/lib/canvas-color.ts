const DEFAULT_RGB = '0,0,0'

function hexToRgbComponents(hex: string): string | null {
  const h = hex.replace('#', '')
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16)
    const g = parseInt(h[1] + h[1], 16)
    const b = parseInt(h[2] + h[2], 16)
    if ([r, g, b].some(Number.isNaN)) return null
    return `${r},${g},${b}`
  }
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return null
  return `${r},${g},${b}`
}

function rgbStringToComponents(value: string): string | null {
  const match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (!match) return null
  const r = Math.round(Number(match[1]))
  const g = Math.round(Number(match[2]))
  const b = Math.round(Number(match[3]))
  if ([r, g, b].some(Number.isNaN)) return null
  return `${r},${g},${b}`
}

let canvasCtx: CanvasRenderingContext2D | null = null

function normalizeColorViaCanvas(color: string): string | null {
  if (typeof document === 'undefined') return null

  if (!canvasCtx) {
    const canvas = document.createElement('canvas')
    canvasCtx = canvas.getContext('2d')
  }
  if (!canvasCtx) return null

  try {
    canvasCtx.fillStyle = '#000000'
    canvasCtx.fillStyle = color
    const parsed = canvasCtx.fillStyle
    if (typeof parsed !== 'string') return null
    if (parsed.startsWith('#')) return hexToRgbComponents(parsed)
    return rgbStringToComponents(parsed)
  } catch {
    return null
  }
}

function cssColorToRgbComponents(color: string): string | null {
  if (typeof document === 'undefined') return null

  const probe = document.createElement('div')
  probe.style.color = color
  document.documentElement.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()

  return rgbStringToComponents(computed) ?? normalizeColorViaCanvas(computed)
}

/**
 * Resolves a CSS or hex color to comma-separated RGB components for canvas rgba().
 */
export function colorToRgbComponents(color: string): string {
  const trimmed = color.trim()
  if (trimmed.startsWith('#')) {
    return hexToRgbComponents(trimmed) ?? DEFAULT_RGB
  }
  return cssColorToRgbComponents(trimmed) ?? DEFAULT_RGB
}

/** Builds an rgba() prefix string: `rgba(r,g,b,` — append alpha and closing paren. */
export function rgbaPrefixFromColor(color: string): string {
  return `rgba(${colorToRgbComponents(color)},`
}

export function rgbTupleFromColor(color: string): [number, number, number] {
  const [r, g, b] = colorToRgbComponents(color).split(',').map(Number)
  return [r, g, b]
}
