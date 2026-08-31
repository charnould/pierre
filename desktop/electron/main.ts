import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log'
import squirrelStartup from 'electron-squirrel-startup'
import { updateElectronApp } from 'update-electron-app'

import { shouldEnableAutoUpdater, updaterOptions } from './auto-updater'

if (process.platform === 'win32') {
  if (squirrelStartup) app.quit()
}

if (
  !process.env['PIERRE_PERF_OUTPUT'] &&
  shouldEnableAutoUpdater(process.platform, app.isPackaged)
) {
  updateElectronApp({
    ...updaterOptions(),
    logger: log
  })
}

import { isSettingsConfigured } from '../src/shared/lib/settings-configured'
import { LOGIN_WINDOW_BOUNDS, WINDOW_MIN_SIZE } from '../src/shared/lib/ui-settings/schema'
import { registerActivitiesHandlers } from './ipc/activities/register-handlers'
import { registerAuthHandlers, installAuthCookieInterceptor } from './ipc/auth/register-handlers'
import { registerAutomationsHandlers } from './ipc/automations/register-handlers'
import { registerBulkOperationsHandlers } from './ipc/bulk-operations/register-handlers'
import { FoundInPageEvent } from './ipc/channels'
import { registerDatastoreHandlers } from './ipc/datastore/register-handlers'
import { registerLedgerHandlers } from './ipc/ledger/register-handlers'
import { registerMascotHandlers } from './ipc/mascot/register-handlers'
import { registerSettingsHandlers } from './ipc/settings/register-handlers'
import { registerStreamHandlers } from './ipc/stream/register-handlers'
import { isAllowedExternalUrl } from './ipc/system/external-url'
import { registerSystemHandlers } from './ipc/system/register-handlers'
import { registerTicketsHandlers } from './ipc/tickets/register-handlers'
import { registerUsersHandlers } from './ipc/users/register-handlers'
import { appWindowAllowedOrigins, attachWindowGuards } from './lib/window-guards'
import { createMascotController, type MascotController } from './mascot-window'
import { attachPerformanceBenchmark } from './perf-benchmark'
import { fetchInboxUnreadCount } from './services/fetch-inbox-unread-count'
import { logMainError } from './services/logging'
import {
  createNotificationBadgePoller,
  readSettingsUrl,
  type NotificationBadgePoller
} from './services/notification-badge-poller'
import { safeStorageCrypto } from './services/secret-crypto'
import { seedMissingUiSettingsDefaults } from './services/seed-ui-settings-defaults'
import { createSettingsStore } from './services/settings-store'
import {
  attachWindowStatePersistence,
  centerWindowBounds,
  ensureBoundsOnScreen,
  resolveInitialWindowBoundsOnScreen,
  type WindowStateHandle
} from './services/window-state'
import { WINDOW_CHROME } from './window-chrome'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARTITION = 'persist:pierre'

let win: BrowserWindow | null = null
let mascot: MascotController | null = null
let badgePoller: NotificationBadgePoller | null = null
let forceQuit = false
let windowStateHandle: WindowStateHandle | null = null
let uiSettingsPath = ''
let store: ReturnType<typeof createSettingsStore> | null = null

function createWindow() {
  const iconPath = (() => {
    if (process.platform === 'win32') {
      return app.isPackaged
        ? join(process.resourcesPath, 'icons/windows/icon.ico')
        : join(__dirname, '../../src/assets/icons/windows/icon.ico')
    }
    if (process.platform === 'linux') {
      return app.isPackaged
        ? join(process.resourcesPath, 'icons/linux/icons/512x512.png')
        : join(__dirname, '../../src/assets/icons/linux/icons/512x512.png')
    }
    return undefined
  })()

  const preloadPath = join(__dirname, '../preload/index.js')
  if (!existsSync(preloadPath)) {
    logMainError(
      'preload-missing',
      new Error(`Preload not found at ${preloadPath}. Run: cd desktop && bun run dev`)
    )
  }

  const raw = store?.readUiSettingsRaw() ?? {}
  const sessionBounds = resolveInitialWindowBoundsOnScreen(raw)

  if (store) {
    // Always seed the session size — never the compact login shell.
    seedMissingUiSettingsDefaults(store, sessionBounds)
  }

  const canAutoLogin = isSettingsConfigured(store?.readSettings() ?? null)
  const bounds = canAutoLogin
    ? sessionBounds
    : ensureBoundsOnScreen(centerWindowBounds(LOGIN_WINDOW_BOUNDS))

  win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(bounds.x !== undefined && bounds.y !== undefined ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: WINDOW_MIN_SIZE.width,
    minHeight: WINDOW_MIN_SIZE.height,
    title: '',
    ...(iconPath ? { icon: iconPath } : {}),
    ...WINDOW_CHROME,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      partition: PARTITION,
      webSecurity: app.isPackaged
    },
    show: false
  })
  attachPerformanceBenchmark(win)

  attachWindowGuards(win.webContents, {
    allowedOrigins: appWindowAllowedOrigins(),
    onExternal: (url) => {
      // Page-supplied: a denied popup hands us whatever the document asked for.
      if (!isAllowedExternalUrl(url)) return
      void shell.openExternal(url.trim()).catch((error) => logMainError('open-external', error))
    }
  })

  // Sans ça, Chromium retombe sur l'URL ou le chemin du fichier chargé.
  win.on('page-title-updated', (event) => event.preventDefault())

  win.webContents.on('found-in-page', (_event, result) => {
    if (!win || win.isDestroyed()) return
    win.webContents.send(FoundInPageEvent, result)
  })

  windowStateHandle?.dispose()
  windowStateHandle = store && win ? attachWindowStatePersistence(win, store) : null
  if (!canAutoLogin) {
    win.setResizable(false)
    windowStateHandle?.setPersistEnabled(false)
  }

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win?.show())

  win.on('closed', () => {
    win = null
    badgePoller?.onMainWindowClosed()
  })
}

app.whenReady().then(() => {
  const userData = app.getPath('userData')
  const settingsPath = join(userData, 'settings.json')
  uiSettingsPath = join(userData, 'ui-settings.json')
  store = createSettingsStore(settingsPath, uiSettingsPath, safeStorageCrypto)

  const mascotPreloadPath = join(__dirname, '../preload/mascot.js')

  installAuthCookieInterceptor(PARTITION)
  registerSettingsHandlers(store, uiSettingsPath, {
    getWindow: () => win,
    getWindowStateHandle: () => windowStateHandle
  })
  registerAuthHandlers(PARTITION, store)
  registerStreamHandlers(PARTITION)
  registerTicketsHandlers(PARTITION)
  registerLedgerHandlers(PARTITION)
  registerActivitiesHandlers(PARTITION)
  registerAutomationsHandlers(PARTITION)
  registerBulkOperationsHandlers(PARTITION)
  registerDatastoreHandlers(PARTITION)
  registerUsersHandlers(PARTITION)
  registerSystemHandlers({
    getWindow: () => win,
    getStore: () => store,
    getWindowStateHandle: () => windowStateHandle
  })
  registerMascotHandlers({
    getMascot: () => mascot,
    onLoggedInChange: (loggedIn) => badgePoller?.setLoggedIn(loggedIn)
  })

  createWindow()

  mascot = createMascotController({
    ensureMainWindow: () => {
      if (win && !win.isDestroyed()) return win
      createWindow()
      return win
    },
    getStore: () => store,
    quitApp: () => {
      forceQuit = true
      app.quit()
    },
    partition: PARTITION,
    preloadPath: mascotPreloadPath
  })

  badgePoller = createNotificationBadgePoller({
    getUrl: () => readSettingsUrl(store),
    hasMainWindow: () => Boolean(win && !win.isDestroyed()),
    setUnreadCount: (count) => mascot?.setUnreadCount(count),
    fetchUnreadCount: (url) => fetchInboxUnreadCount(PARTITION, url)
  })

  app.on('activate', () => {
    if (!win || win.isDestroyed()) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep running while the mascot is still open (it outlives the main window).
  const mascotWin = mascot?.getWindow()
  if (mascotWin && !mascotWin.isDestroyed()) return
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  // In packaged builds, Cmd+Q only closes windows: the mascot stays available,
  // and its context menu remains the explicit exit (`quitApp`). Development
  // restarts must quit fully or electron-vite leaves stale windows behind.
  const mascotWin = mascot?.getWindow()
  if (
    app.isPackaged &&
    !forceQuit &&
    mascotWin &&
    !mascotWin.isDestroyed() &&
    mascotWin.isVisible()
  ) {
    event.preventDefault()
    for (const other of BrowserWindow.getAllWindows()) {
      if (other !== mascotWin) other.close()
    }
    return
  }

  badgePoller?.stop()
  badgePoller = null
  mascot?.destroy()
  mascot = null
})
