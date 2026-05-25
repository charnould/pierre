import { screen, type BrowserWindow } from 'electron'

import { clampWindowSize, DEFAULT_WINDOW_BOUNDS } from '../../src/shared/lib/ui-settings/schema'
import type { SettingsStore } from './settings-store'
import {
  computeCenteredPosition,
  parseWindowBoundsFromSettings,
  type WindowBounds
} from './window-bounds'

export function centerWindowBounds(size: { width: number; height: number }): WindowBounds {
  const { width, height } = clampWindowSize(size.width, size.height)
  const area = screen.getPrimaryDisplay().workArea
  const { x, y } = computeCenteredPosition(area, width, height)
  return { width, height, x, y }
}

export function resolveInitialWindowBoundsOnScreen(raw: Record<string, unknown>): WindowBounds {
  const saved = parseWindowBoundsFromSettings(raw)
  if (saved) return ensureBoundsOnScreen(saved)
  return ensureBoundsOnScreen(centerWindowBounds(DEFAULT_WINDOW_BOUNDS))
}

const PERSIST_DEBOUNCE_MS = 400
const MIN_VISIBLE_PX = 100

function windowIsWithinWorkArea(
  area: Electron.Rectangle,
  bounds: Required<Pick<WindowBounds, 'width' | 'height'>> & Pick<WindowBounds, 'x' | 'y'>
): boolean {
  const x = bounds.x ?? area.x
  const y = bounds.y ?? area.y
  const left = Math.max(x, area.x)
  const top = Math.max(y, area.y)
  const right = Math.min(x + bounds.width, area.x + area.width)
  const bottom = Math.min(y + bounds.height, area.y + area.height)
  return right - left >= MIN_VISIBLE_PX && bottom - top >= MIN_VISIBLE_PX
}

export function ensureBoundsOnScreen(bounds: WindowBounds): WindowBounds {
  const { width, height } = clampWindowSize(bounds.width, bounds.height)
  if (bounds.x === undefined || bounds.y === undefined) {
    return { width, height }
  }

  const display = screen.getDisplayMatching({ x: bounds.x, y: bounds.y, width, height })
  const area = display.workArea

  let x = bounds.x
  let y = bounds.y

  if (!windowIsWithinWorkArea(area, { x, y, width, height })) {
    x = area.x + Math.round((area.width - width) / 2)
    y = area.y + Math.round((area.height - height) / 2)
  }

  x = Math.max(area.x, Math.min(x, area.x + area.width - width))
  y = Math.max(area.y, Math.min(y, area.y + area.height - height))

  return { x, y, width, height }
}

function applyBoundsToWindow(win: BrowserWindow, bounds: WindowBounds): void {
  const adjusted = ensureBoundsOnScreen(bounds)
  if (adjusted.x !== undefined && adjusted.y !== undefined) {
    win.setBounds({
      x: adjusted.x,
      y: adjusted.y,
      width: adjusted.width,
      height: adjusted.height
    })
    return
  }

  win.setSize(adjusted.width, adjusted.height, true)
}

export type WindowStateHandle = {
  runWithoutPersist: (fn: () => void) => void
  dispose: () => void
}

export function applyWindowBoundsFromSettings(
  win: BrowserWindow | null,
  raw: Record<string, unknown>,
  handle?: WindowStateHandle | null
): void {
  if (!win || win.isDestroyed()) return
  const bounds = parseWindowBoundsFromSettings(raw)
  if (!bounds) return

  const apply = () => applyBoundsToWindow(win, bounds)
  if (handle) handle.runWithoutPersist(apply)
  else apply()
}

export function attachWindowStatePersistence(
  win: BrowserWindow,
  store: SettingsStore
): WindowStateHandle {
  let suppressPersist = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const persist = () => {
    if (suppressPersist || win.isDestroyed()) return
    const [width, height] = win.getSize()
    const [x, y] = win.getPosition()
    void store.patchWindowSerialized({ width, height, x, y })
  }

  const schedulePersist = () => {
    if (suppressPersist) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      persist()
    }, PERSIST_DEBOUNCE_MS)
  }

  const onResize = () => schedulePersist()
  const onMove = () => schedulePersist()

  win.on('resize', onResize)
  win.on('move', onMove)

  return {
    runWithoutPersist(fn) {
      suppressPersist = true
      try {
        fn()
      } finally {
        suppressPersist = false
      }
    },
    dispose() {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (!win.isDestroyed()) {
        win.removeListener('resize', onResize)
        win.removeListener('move', onMove)
      }
    }
  }
}

export {
  boundsToPartial,
  parseWindowBoundsFromSettings,
  resolveInitialWindowBounds
} from './window-bounds'
