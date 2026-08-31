import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { app, BrowserWindow, Menu, screen } from 'electron'

import {
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  parseMascotColor,
  parseMascotShape,
  type MascotLook
} from '../src/mascot/look'
import {
  clampMascotSize,
  mascotWindowExtent,
  resolveMascotSettings,
  resolveUiSettingsFromRaw,
  type UiSettings
} from '../src/shared/lib/ui-settings/schema'
import {
  MascotLookEvent,
  MascotOpenNotificationsEvent,
  MascotUnreadCountEvent
} from './ipc/channels'
import { appWindowAllowedOrigins, attachWindowGuards } from './lib/window-guards'
import { logMainError } from './services/logging'
import type { SettingsStore } from './services/settings-store'

const MASCOT_SCREEN_MARGIN = 24

const __dirname = dirname(fileURLToPath(import.meta.url))

export type MascotController = {
  setUnreadCount: (count: number) => void
  activate: () => void
  setBounds: (params: {
    x?: number
    y?: number
    dx?: number
    dy?: number
    persist?: boolean
  }) => void
  setEnabled: (enabled: boolean) => Promise<UiSettings>
  setSize: (params: { size: number; persist?: boolean }) => void
  setLook: (params: {
    shape?: string
    color?: string
    badgeColor?: string
    persist?: boolean
  }) => void
  showMenu: () => void
  syncVisibility: (loggedIn: boolean) => void
  destroy: () => void
  getWindow: () => BrowserWindow | null
}

type MascotControllerOptions = {
  /** Recreate the main window when the mascot is clicked after it was closed. */
  ensureMainWindow: () => BrowserWindow | null
  getStore: () => SettingsStore | null
  /** Real quit — the mascot menu is the only way out once Cmd+Q is intercepted. */
  quitApp: () => void
  partition: string
  preloadPath: string
}

function defaultMascotPosition(size: number): { x: number; y: number } {
  const display = screen.getPrimaryDisplay()
  const { workArea } = display
  const extent = mascotWindowExtent(size)
  return {
    x: Math.round(workArea.x + workArea.width - extent - MASCOT_SCREEN_MARGIN),
    y: Math.round(workArea.y + workArea.height - extent - MASCOT_SCREEN_MARGIN)
  }
}

function clampMascotPosition(x: number, y: number, size: number): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x, y })
  const { workArea } = display
  const maxX = workArea.x + workArea.width - size
  const maxY = workArea.y + workArea.height - size
  return {
    x: Math.min(Math.max(Math.round(x), workArea.x), maxX),
    y: Math.min(Math.max(Math.round(y), workArea.y), maxY)
  }
}

function loadMascotPage(win: BrowserWindow): void {
  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/mascot.html`)
    return
  }
  void win.loadFile(join(__dirname, '../renderer/mascot.html'))
}

/**
 * Owns the always-on-top desktop mascot window lifecycle (Windows-first).
 */
export function createMascotController(opts: MascotControllerOptions): MascotController {
  let mascotWin: BrowserWindow | null = null
  let unreadCount = 0
  let loggedIn = false
  let look: MascotLook = {
    shape: DEFAULT_MASCOT_SHAPE,
    color: DEFAULT_MASCOT_COLOR,
    badgeColor: DEFAULT_MASCOT_BADGE_COLOR
  }

  const readMascot = () => {
    const store = opts.getStore()
    if (!store) return resolveMascotSettings(null)
    return resolveMascotSettings(resolveUiSettingsFromRaw(store.readUiSettingsRaw()))
  }

  const mascot = readMascot()
  look = { shape: mascot.shape, color: mascot.color, badgeColor: mascot.badgeColor }

  const shouldShow = () => loggedIn && readMascot().enabled

  const pushUnread = (win: BrowserWindow) => {
    if (win.isDestroyed()) return
    win.webContents.send(MascotUnreadCountEvent, unreadCount)
  }

  const pushLook = (win: BrowserWindow) => {
    if (win.isDestroyed()) return
    win.webContents.send(MascotLookEvent, look)
  }

  const destroyWindow = () => {
    if (!mascotWin || mascotWin.isDestroyed()) {
      mascotWin = null
      return
    }
    mascotWin.destroy()
    mascotWin = null
  }

  const ensureWindow = (): BrowserWindow | null => {
    if (mascotWin && !mascotWin.isDestroyed()) return mascotWin

    const mascot = readMascot()
    const extent = mascotWindowExtent(mascot.size)
    const fallback = defaultMascotPosition(mascot.size)
    const position = clampMascotPosition(mascot.x ?? fallback.x, mascot.y ?? fallback.y, extent)

    try {
      mascotWin = new BrowserWindow({
        width: extent,
        height: extent,
        x: position.x,
        y: position.y,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        hasShadow: false,
        show: false,
        focusable: true,
        webPreferences: {
          preload: opts.preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
          partition: opts.partition,
          webSecurity: app.isPackaged
        }
      })
    } catch (error) {
      logMainError('mascot-window-create', error)
      mascotWin = null
      return null
    }

    attachWindowGuards(mascotWin.webContents, { allowedOrigins: appWindowAllowedOrigins() })

    mascotWin.setAlwaysOnTop(true, 'floating')
    // Sans `skipTransformProcessType`, Electron bascule le type de processus à
    // chaque appel, et la mascotte disparaît quand la dernière fenêtre se ferme.
    mascotWin.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })

    mascotWin.on('closed', () => {
      mascotWin = null
    })

    loadMascotPage(mascotWin)
    mascotWin.webContents.on('did-finish-load', () => {
      if (mascotWin && !mascotWin.isDestroyed()) {
        pushUnread(mascotWin)
        pushLook(mascotWin)
      }
    })

    return mascotWin
  }

  const refreshVisibility = () => {
    if (!shouldShow()) {
      if (mascotWin && !mascotWin.isDestroyed()) mascotWin.hide()
      return
    }

    const win = ensureWindow()
    if (!win || win.isDestroyed()) return
    if (!win.isVisible()) win.showInactive()
    pushUnread(win)
    pushLook(win)
  }

  const controller: MascotController = {
    setUnreadCount(count: number) {
      unreadCount = Math.max(0, Math.floor(count))
      if (mascotWin && !mascotWin.isDestroyed() && mascotWin.isVisible()) {
        pushUnread(mascotWin)
      }
    },

    activate() {
      const main = opts.ensureMainWindow()
      if (!main || main.isDestroyed()) return
      if (main.isMinimized()) main.restore()
      main.show()
      main.focus()

      const openNotifications = () => {
        if (!main.isDestroyed()) main.webContents.send(MascotOpenNotificationsEvent)
      }

      if (main.webContents.isLoadingMainFrame()) {
        main.webContents.once('did-finish-load', openNotifications)
      } else {
        openNotifications()
      }
    },

    setBounds({ x, y, dx = 0, dy = 0, persist = false }) {
      const win =
        mascotWin && !mascotWin.isDestroyed() ? mascotWin : shouldShow() ? ensureWindow() : null
      if (!win || win.isDestroyed()) return

      const [cx, cy] = win.getPosition()
      const [width] = win.getSize()
      const next = clampMascotPosition(
        x !== undefined ? x : cx + dx,
        y !== undefined ? y : cy + dy,
        width
      )
      win.setPosition(next.x, next.y)

      if (!persist) return
      const store = opts.getStore()
      if (!store) return
      void store.patchMascotSerialized({ x: next.x, y: next.y }).catch((error) => {
        logMainError('mascot-persist-position', error)
      })
    },

    async setEnabled(enabled: boolean) {
      const store = opts.getStore()
      if (!store) {
        refreshVisibility()
        return resolveUiSettingsFromRaw({})
      }
      const next = await store.patchMascotSerialized({ enabled })
      refreshVisibility()
      return next
    },

    setSize({ size, persist = false }) {
      const next = clampMascotSize(size)
      const win = mascotWin && !mascotWin.isDestroyed() ? mascotWin : null

      if (win) {
        const extent = mascotWindowExtent(next)
        win.setSize(extent, extent)
        // Grandir contre un bord d'écran pousserait la mascotte hors du bureau.
        const [cx, cy] = win.getPosition()
        const position = clampMascotPosition(cx, cy, extent)
        win.setPosition(position.x, position.y)
      }

      if (!persist) return
      const store = opts.getStore()
      if (!store) return
      void store.patchMascotSerialized({ size: next }).catch((error) => {
        logMainError('mascot-persist-size', error)
      })
    },

    setLook({ shape, color, badgeColor, persist = false }) {
      const nextShape = parseMascotShape(shape) ?? look.shape
      const nextColor = parseMascotColor(color) ?? look.color
      const nextBadge = parseMascotColor(badgeColor) ?? look.badgeColor
      look = { shape: nextShape, color: nextColor, badgeColor: nextBadge }
      if (mascotWin && !mascotWin.isDestroyed()) pushLook(mascotWin)

      if (!persist) return
      const store = opts.getStore()
      if (!store) return
      void store
        .patchMascotSerialized({ shape: nextShape, color: nextColor, badgeColor: nextBadge })
        .catch((error) => {
          logMainError('mascot-persist-look', error)
        })
    },

    showMenu() {
      const win = mascotWin && !mascotWin.isDestroyed() ? mascotWin : null
      if (!win) return

      Menu.buildFromTemplate([
        { label: 'Ouvrir Pierre', click: () => controller.activate() },
        { label: 'Masquer le compagnon', click: () => void controller.setEnabled(false) },
        { type: 'separator' },
        { label: 'Quitter Pierre', click: () => opts.quitApp() }
      ]).popup({ window: win })
    },

    syncVisibility(nextLoggedIn: boolean) {
      loggedIn = nextLoggedIn
      refreshVisibility()
    },

    destroy() {
      destroyWindow()
    },

    getWindow() {
      return mascotWin && !mascotWin.isDestroyed() ? mascotWin : null
    }
  }

  return controller
}
