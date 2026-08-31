import { SURFACE_BASE_HEX } from '../src/shared/lib/surface-colors'

/**
 * Native window controls + paper-coloured title strip.
 * macOS: hidden titlebar, OS traffic lights. Windows/Linux: overlay tinted to paper.
 */
export const WINDOW_CHROME = {
  titleBarStyle: 'hidden' as const,
  backgroundColor: SURFACE_BASE_HEX,
  ...(process.platform === 'darwin'
    ? { trafficLightPosition: { x: 18, y: 10 } }
    : { titleBarOverlay: { color: SURFACE_BASE_HEX, height: 32 } })
}
