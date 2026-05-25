import { existsSync } from 'fs'

import {
  app,
  autoUpdater,
  BrowserWindow,
  clipboard,
  ipcMain,
  shell,
  type BrowserWindow as BW
} from 'electron'

import { DEFAULT_WINDOW_BOUNDS } from '../../../src/shared/lib/ui-settings/schema'
import { triggerAppUpdateCheck } from '../../services/app-update'
import { logMainError } from '../../services/logging'
import type { SettingsStore } from '../../services/settings-store'
import { centerWindowBounds } from '../../services/window-state'
import { WINDOW_CHROME } from '../../window-chrome'
import { IpcChannel } from '../channels'
import { ARAVIS_PARTITION, hasAravisSessionForUrl } from './aravis-session'
import { buildBridgeScript, buildErrorHtml } from './in-app-browser'

type SystemHandlersContext = {
  getWindow: () => BW | null
  getStore: () => SettingsStore | null
  getUiSettingsPath: () => string
}

/**
 * Registers system utility IPC handlers (clipboard, shell, window).
 */
export function registerSystemHandlers(ctx: SystemHandlersContext): void {
  ipcMain.handle(IpcChannel.system.revealUiSettings, async () => {
    const store = ctx.getStore()
    const uiSettingsPath = ctx.getUiSettingsPath()
    if (!store) return false
    if (!existsSync(uiSettingsPath)) {
      await store.writeUiSettingsSerialized({})
    }
    shell.showItemInFolder(uiSettingsPath)
    return true
  })

  ipcMain.handle(IpcChannel.system.writeClipboard, (_, text) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle(IpcChannel.system.openExternal, async (_, url: string) => {
    const trimmed = typeof url === 'string' ? url.trim() : ''
    if (!trimmed) return false
    try {
      await shell.openExternal(trimmed)
      return true
    } catch (error) {
      logMainError('open-external', error)
      return false
    }
  })

  ipcMain.handle(IpcChannel.system.resizeTo, (_, { width, height }) => {
    const win = ctx.getWindow()
    if (!win || win.isDestroyed()) return
    win.setSize(width, height, true)
  })

  ipcMain.handle(IpcChannel.system.resetWindowToFactory, async () => {
    const win = ctx.getWindow()
    if (!win || win.isDestroyed()) return false

    const bounds = centerWindowBounds(DEFAULT_WINDOW_BOUNDS)
    win.setBounds({
      x: bounds.x ?? 0,
      y: bounds.y ?? 0,
      width: bounds.width,
      height: bounds.height
    })

    const store = ctx.getStore()
    if (store) {
      await store.patchWindowSerialized({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y
      })
    }
    return true
  })

  ipcMain.handle(IpcChannel.system.getAppVersion, () => app.getVersion())

  ipcMain.handle(IpcChannel.system.checkForAppUpdates, () =>
    triggerAppUpdateCheck(process.platform, app.isPackaged, () => autoUpdater.checkForUpdates())
  )

  ipcMain.handle(IpcChannel.system.fetchUrl, async (_, url: string) => {
    const trimmed = typeof url === 'string' ? url.trim() : ''
    if (!trimmed.startsWith('https://raw.githubusercontent.com/')) return null
    try {
      const response = await fetch(trimmed)
      if (!response.ok) return null
      return response.text()
    } catch (error) {
      logMainError('fetch-url', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.system.hasAravisSession, async (_, loginUrl: string) => {
    const trimmed = typeof loginUrl === 'string' ? loginUrl.trim() : ''
    if (!trimmed) return false
    return hasAravisSessionForUrl(trimmed)
  })

  ipcMain.handle(
    IpcChannel.system.openInAppBrowser,
    (_, { url, answer }: { url: string; answer: string }) => {
      const parent = ctx.getWindow()
      if (!parent || parent.isDestroyed()) return Promise.resolve(false)

      const [w, h] = parent.getSize()
      const child = new BrowserWindow({
        parent,
        modal: true,
        width: w,
        height: h,
        ...WINDOW_CHROME,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          partition: ARAVIS_PARTITION
        },
        show: false
      })

      let loadFailed = false

      child.webContents.on('did-finish-load', () => {
        if (loadFailed) return
        void child.webContents
          .executeJavaScript(buildBridgeScript(answer))
          .then(() => {
            child.show()
          })
          .catch((err) => {
            logMainError('in-app-browser-inject', err)
            child.show()
          })
      })

      child.webContents.on('did-fail-load', (_e, _code, _desc, validatedURL, isMainFrame) => {
        if (!isMainFrame) return
        loadFailed = true
        void child.webContents
          .loadURL(
            `data:text/html;charset=utf-8,${encodeURIComponent(buildErrorHtml(validatedURL || url))}`
          )
          .then(() => {
            child.show()
          })
          .catch((err) => {
            logMainError('in-app-browser-error-page', err)
          })
      })

      return new Promise<boolean>((resolve) => {
        child.on('closed', () => resolve(true))
        child.loadURL(url)
      })
    }
  )
}
