import { screen, type BrowserWindow } from 'electron'

import { SURFACE_BASE_HEX } from '../../src/shared/lib/surface-colors'
import {
  clampWindowSize,
  DEFAULT_WINDOW_BOUNDS,
  LOGIN_WINDOW_BOUNDS
} from '../../src/shared/lib/ui-settings/schema'
import { easeOutCubic } from './ease-out-cubic'
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
/** Cross-platform tween when Electron's native `animate` flag is unavailable. */
const AUTH_LAYOUT_TWEEN_MS = 280
const AUTH_LAYOUT_NATIVE_FALLBACK_MS = 420

type Rect = { x: number; y: number; width: number; height: number }

let authLayoutAnimToken = 0

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

function toRect(win: BrowserWindow, bounds: WindowBounds): Rect {
  const adjusted = ensureBoundsOnScreen(bounds)
  const current = win.getBounds()
  return {
    x: adjusted.x ?? current.x,
    y: adjusted.y ?? current.y,
    width: adjusted.width,
    height: adjusted.height
  }
}

function rectsNearlyEqual(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.x - b.x) <= 1 &&
    Math.abs(a.y - b.y) <= 1 &&
    Math.abs(a.width - b.width) <= 1 &&
    Math.abs(a.height - b.height) <= 1
  )
}

function applyBoundsToWindow(win: BrowserWindow, bounds: WindowBounds): void {
  win.setBounds(toRect(win, bounds))
}

/**
 * Drop the React tree out of layout/paint so AppKit can animate a solid window
 * without Chromium reflowing blur layers every frame.
 */
async function freezeWindowContents(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed() || win.webContents.isDestroyed()) return
  try {
    await win.webContents.executeJavaScript(
      `(() => {
        const root = document.getElementById('root')
        if (root) root.style.display = 'none'
        document.documentElement.style.background = '${SURFACE_BASE_HEX}'
        document.body.style.background = '${SURFACE_BASE_HEX}'
      })()`,
      true
    )
  } catch {
    // Best-effort: animation still proceeds without a freeze.
  }
}

async function unfreezeWindowContents(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed() || win.webContents.isDestroyed()) return
  try {
    await win.webContents.executeJavaScript(
      `(() => {
        const root = document.getElementById('root')
        if (root) root.style.display = ''
        document.documentElement.style.background = ''
        document.body.style.background = ''
      })()`,
      true
    )
  } catch {
    // ignore
  }
}

function tweenBoundsTo(win: BrowserWindow, target: Rect, token: number): Promise<void> {
  return new Promise((resolve) => {
    const start = win.getBounds()
    const t0 = performance.now()

    const tick = () => {
      if (token !== authLayoutAnimToken || win.isDestroyed()) {
        resolve()
        return
      }
      const p = easeOutCubic((performance.now() - t0) / AUTH_LAYOUT_TWEEN_MS)
      win.setBounds({
        x: Math.round(start.x + (target.x - start.x) * p),
        y: Math.round(start.y + (target.y - start.y) * p),
        width: Math.round(start.width + (target.width - start.width) * p),
        height: Math.round(start.height + (target.height - start.height) * p)
      })
      if (p < 1) {
        setImmediate(tick)
        return
      }
      resolve()
    }
    tick()
  })
}

function animateBoundsTo(win: BrowserWindow, target: Rect): Promise<void> {
  const token = ++authLayoutAnimToken

  if (rectsNearlyEqual(win.getBounds(), target)) {
    return Promise.resolve()
  }

  // Native animation is macOS-only; elsewhere we tween setBounds ourselves.
  if (process.platform === 'darwin') {
    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled || token !== authLayoutAnimToken) return
        settled = true
        win.removeListener('resized', onResized)
        resolve()
      }
      const onResized = () => finish()
      win.once('resized', onResized)
      win.setBounds(target, true)
      setTimeout(finish, AUTH_LAYOUT_NATIVE_FALLBACK_MS)
    })
  }

  return tweenBoundsTo(win, target, token)
}

export type WindowStateHandle = {
  runWithoutPersist: (fn: () => void) => void
  setPersistEnabled: (enabled: boolean) => void
  dispose: () => void
}

/**
 * Login shell: compact centered window, bounds not written to ui-settings.
 * Session shell: restore saved (or default) bounds and resume persistence.
 *
 * Freezes the renderer during the resize so the OS animates a solid surface
 * (Chromium layout/paint is the usual source of stutter). Optional `beforeAnimate`
 * runs while frozen — used to swap login ↔ session UI before the shell moves.
 */
export async function applyAuthWindowLayout(
  win: BrowserWindow | null,
  options: {
    loggedIn: boolean
    uiSettingsRaw: Record<string, unknown>
    handle?: WindowStateHandle | null
    beforeAnimate?: () => Promise<void>
  }
): Promise<void> {
  if (!win || win.isDestroyed()) return

  const { loggedIn, uiSettingsRaw, handle, beforeAnimate } = options
  const bounds = loggedIn
    ? resolveInitialWindowBoundsOnScreen(uiSettingsRaw)
    : ensureBoundsOnScreen(centerWindowBounds(LOGIN_WINDOW_BOUNDS))
  const target = toRect(win, bounds)

  // Keep mid-animation sizes out of ui-settings; re-enable only for session.
  handle?.setPersistEnabled(false)

  if (rectsNearlyEqual(win.getBounds(), target)) {
    if (!win.isDestroyed()) win.setResizable(loggedIn)
    if (loggedIn) handle?.setPersistEnabled(true)
    return
  }

  win.setResizable(false)

  await freezeWindowContents(win)
  try {
    await beforeAnimate?.()
    await animateBoundsTo(win, target)
  } finally {
    await unfreezeWindowContents(win)
    if (!win.isDestroyed()) win.setResizable(loggedIn)
  }

  if (loggedIn && !win.isDestroyed()) {
    handle?.setPersistEnabled(true)
  }
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
  let persistEnabled = true
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const clearDebounce = () => {
    if (!debounceTimer) return
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  const persist = () => {
    if (!persistEnabled || suppressPersist || win.isDestroyed()) return
    const [width, height] = win.getSize()
    const [x, y] = win.getPosition()
    void store.patchWindowSerialized({ width, height, x, y })
  }

  const schedulePersist = () => {
    if (!persistEnabled || suppressPersist) return
    clearDebounce()
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
    setPersistEnabled(enabled) {
      persistEnabled = enabled
      if (!enabled) clearDebounce()
    },
    dispose() {
      clearDebounce()
      if (!win.isDestroyed()) {
        win.removeListener('resize', onResize)
        win.removeListener('move', onMove)
      }
    }
  }
}
