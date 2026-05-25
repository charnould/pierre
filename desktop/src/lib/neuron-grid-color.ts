const DEFAULT_RGB = '0,0,238'

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

function cssColorToRgbComponents(color: string): string | null {
  if (typeof document === 'undefined') return null
  const probe = document.createElement('div')
  probe.style.color = color
  document.documentElement.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  const match = computed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (!match) return null
  const r = Math.round(Number(match[1]))
  const g = Math.round(Number(match[2]))
  const b = Math.round(Number(match[3]))
  if ([r, g, b].some(Number.isNaN)) return null
  return `${r},${g},${b}`
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

/** Builds the rgba prefix used by NeuronGrid canvas drawing. */
export function neuronGridRgbaPrefix(color: string): string {
  return `rgba(${colorToRgbComponents(color)},`
}
