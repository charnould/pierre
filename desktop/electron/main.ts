import { existsSync } from 'fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { app, BrowserWindow } from 'electron'

import { shouldEnableAutoUpdater, updaterOptions } from './auto-updater'

const require = createRequire(import.meta.url)

if (process.platform === 'win32') {
  if (require('electron-squirrel-startup')) app.quit()
}

if (shouldEnableAutoUpdater(process.platform, app.isPackaged)) {
  const { updateElectronApp } = require('update-electron-app')
  updateElectronApp({
    ...updaterOptions(),
    logger: require('electron-log')
  })
}

import { WINDOW_MIN_SIZE } from '../src/shared/lib/ui-settings/schema'
import { registerAuthHandlers, installAuthCookieInterceptor } from './ipc/auth/register-handlers'
import { registerSettingsHandlers } from './ipc/settings/register-handlers'
import { registerStreamHandlers } from './ipc/stream/register-handlers'
import { registerSystemHandlers } from './ipc/system/register-handlers'
import { registerTicketsHandlers } from './ipc/tickets/register-handlers'
import { logMainError } from './services/logging'
import { seedMissingUiSettingsDefaults } from './services/seed-ui-settings-defaults'
import { createSettingsStore } from './services/settings-store'
import {
  attachWindowStatePersistence,
  resolveInitialWindowBoundsOnScreen,
  type WindowStateHandle
} from './services/window-state'
import { WINDOW_CHROME } from './window-chrome'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARTITION = 'persist:pierre'

let win: BrowserWindow | null = null
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
  const bounds = resolveInitialWindowBoundsOnScreen(raw)

  if (store) {
    seedMissingUiSettingsDefaults(store, bounds)
  }

  win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(bounds.x !== undefined && bounds.y !== undefined ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: WINDOW_MIN_SIZE.width,
    minHeight: WINDOW_MIN_SIZE.height,
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

  windowStateHandle?.dispose()
  windowStateHandle = store && win ? attachWindowStatePersistence(win, store) : null

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win?.show())
}

app.whenReady().then(() => {
  const userData = app.getPath('userData')
  const settingsPath = join(userData, 'settings.json')
  uiSettingsPath = join(userData, 'ui-settings.json')
  store = createSettingsStore(settingsPath, uiSettingsPath)

  installAuthCookieInterceptor(PARTITION)
  registerSettingsHandlers(store, uiSettingsPath, {
    getWindow: () => win,
    getWindowStateHandle: () => windowStateHandle
  })
  registerAuthHandlers(PARTITION, store)
  registerStreamHandlers(PARTITION)
  registerTicketsHandlers(PARTITION)
  registerSystemHandlers({
    getWindow: () => win,
    getStore: () => store,
    getUiSettingsPath: () => uiSettingsPath
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
