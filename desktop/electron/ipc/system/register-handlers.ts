import { existsSync } from 'fs'
import { join } from 'path'

import {
  app,
  autoUpdater,
  BrowserWindow,
  clipboard,
  ipcMain,
  shell,
  type BrowserWindow as BW,
  type WebContents
} from 'electron'

import { SURFACE_BASE_HEX } from '../../../src/shared/lib/surface-colors'
import {
  DEFAULT_WINDOW_BOUNDS,
  LOGIN_WINDOW_BOUNDS
} from '../../../src/shared/lib/ui-settings/schema'
import { attachWindowGuards } from '../../lib/window-guards'
import { triggerAppUpdateCheck } from '../../services/app-update'
import { logMainError } from '../../services/logging'
import type { SettingsStore } from '../../services/settings-store'
import {
  applyAuthWindowLayout,
  centerWindowBounds,
  type WindowStateHandle
} from '../../services/window-state'
import { AuthWindowLayoutSwapEvent, IpcChannel } from '../channels'
import { buildReportInjectScript } from './automation-report'
import { isAllowedExternalUrl } from './external-url'
import {
  buildTicketExternalApplicationErrorHtml,
  buildTicketExternalApplicationInjectScript,
  TICKET_EXTERNAL_APPLICATION_PARTITION
} from './ticket-external-application'

type SystemHandlersContext = {
  getWindow: () => BW | null
  getStore: () => SettingsStore | null
  getWindowStateHandle: () => WindowStateHandle | null
}

function reportShellPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'report/shell.html')
    : join(__dirname, '../../src/assets/report/shell.html')
}

const AUTH_UI_SWAP_ACK_MS = 250

/** Ask the renderer to commit login/session UI while the shell is frozen. */
function waitForAuthWindowUiSwap(wc: WebContents, loggedIn: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (wc.isDestroyed()) {
      resolve()
      return
    }

    const finish = () => {
      clearTimeout(timer)
      ipcMain.removeListener(IpcChannel.system.authWindowLayoutSwapAck, onAck)
      resolve()
    }
    const onAck = () => finish()
    const timer = setTimeout(finish, AUTH_UI_SWAP_ACK_MS)
    ipcMain.once(IpcChannel.system.authWindowLayoutSwapAck, onAck)
    wc.send(AuthWindowLayoutSwapEvent, { loggedIn })
  })
}

/**
 * Registers system utility IPC handlers (clipboard, shell, window).
 */
export function registerSystemHandlers(ctx: SystemHandlersContext): void {
  ipcMain.handle(IpcChannel.system.writeClipboard, (_, text) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle(IpcChannel.system.openExternal, async (_, url: string) => {
    if (!isAllowedExternalUrl(url)) return false
    try {
      await shell.openExternal(url.trim())
      return true
    } catch (error) {
      logMainError('open-external', error)
      return false
    }
  })

  ipcMain.handle(IpcChannel.system.setAuthWindowLayout, async (_, { loggedIn }) => {
    const nextLoggedIn = Boolean(loggedIn)
    await applyAuthWindowLayout(ctx.getWindow(), {
      loggedIn: nextLoggedIn,
      uiSettingsRaw: ctx.getStore()?.readUiSettingsRaw() ?? {},
      handle: ctx.getWindowStateHandle(),
      beforeAnimate: async () => {
        const win = ctx.getWindow()
        if (!win || win.isDestroyed()) return
        await waitForAuthWindowUiSwap(win.webContents, nextLoggedIn)
      }
    })
  })

  ipcMain.handle(IpcChannel.system.resetWindowToFactory, async () => {
    const win = ctx.getWindow()
    if (!win || win.isDestroyed()) return false

    const sessionBounds = centerWindowBounds(DEFAULT_WINDOW_BOUNDS)
    const store = ctx.getStore()
    if (store) {
      await store.patchWindowSerialized({
        width: sessionBounds.width,
        height: sessionBounds.height,
        x: sessionBounds.x,
        y: sessionBounds.y
      })
    }

    // Factory reset always logs out. Persist the session factory size, never the
    // compact login shell — then size the live window for the login form.
    const handle = ctx.getWindowStateHandle()
    handle?.setPersistEnabled(false)
    const loginBounds = centerWindowBounds(LOGIN_WINDOW_BOUNDS)
    const applyLogin = () => {
      win.setResizable(false)
      win.setBounds({
        x: loginBounds.x ?? 0,
        y: loginBounds.y ?? 0,
        width: loginBounds.width,
        height: loginBounds.height
      })
    }
    if (handle) handle.runWithoutPersist(applyLogin)
    else applyLogin()
    return true
  })

  ipcMain.handle(IpcChannel.system.getAppVersion, () => app.getVersion())

  ipcMain.handle(IpcChannel.system.checkForAppUpdates, () =>
    triggerAppUpdateCheck(process.platform, app.isPackaged, () => autoUpdater.checkForUpdates())
  )

  ipcMain.handle(
    IpcChannel.system.findInPage,
    (
      _,
      text: string,
      options?: {
        forward?: boolean
        findNext?: boolean
        matchCase?: boolean
      }
    ) => {
      const win = ctx.getWindow()
      if (!win || win.isDestroyed()) return 0
      if (typeof text !== 'string' || !text) return 0
      return win.webContents.findInPage(text, options)
    }
  )

  ipcMain.handle(
    IpcChannel.system.stopFindInPage,
    (_, action: 'clearSelection' | 'keepSelection' | 'activateSelection') => {
      const win = ctx.getWindow()
      if (!win || win.isDestroyed()) return false
      win.webContents.stopFindInPage(action)
      return true
    }
  )

  ipcMain.handle(IpcChannel.system.fetchUrl, async (_, url: string) => {
    const trimmed = typeof url === 'string' ? url.trim() : ''
    const isRaw = trimmed.startsWith('https://raw.githubusercontent.com/charnould/pierre/')
    const isContents = trimmed.startsWith('https://api.github.com/repos/charnould/pierre/contents/')
    if (!isRaw && !isContents) return null
    try {
      const response = await fetch(trimmed, {
        headers: isContents
          ? {
              Accept: 'application/vnd.github.raw',
              'User-Agent': 'pierre-desktop'
            }
          : undefined
      })
      if (!response.ok) return null
      return response.text()
    } catch (error) {
      logMainError('fetch-url', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.system.openAutomationReport, (_, { html }: { html: string }) => {
    const parent = ctx.getWindow()
    if (!parent || parent.isDestroyed()) return Promise.resolve(false)
    if (typeof html !== 'string' || !html.trim()) return Promise.resolve(false)

    const shellPath = reportShellPath()
    if (!existsSync(shellPath)) {
      logMainError('automation-report-shell-missing', new Error(shellPath))
      return Promise.resolve(false)
    }

    const [w, h] = parent.getSize()
    const child = new BrowserWindow({
      parent,
      modal: true,
      width: w,
      height: h,
      backgroundColor: SURFACE_BASE_HEX,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    })

    attachWindowGuards(child.webContents, { allowedOrigins: ['file:'] })

    child.webContents.on('did-finish-load', () => {
      void child.webContents
        .executeJavaScript(buildReportInjectScript(html))
        .then(() => {
          child.show()
        })
        .catch((err) => {
          logMainError('automation-report-inject', err)
          child.show()
        })
    })

    return new Promise<boolean>((resolve) => {
      child.on('closed', () => resolve(true))
      void child.loadFile(shellPath).catch((err) => {
        logMainError('automation-report-load', err)
        if (!child.isDestroyed()) child.close()
        resolve(false)
      })
    })
  })

  ipcMain.handle(
    IpcChannel.system.openTicketExternalApplication,
    (_, params: { url: string; message: string; selector: string }) => {
      const parent = ctx.getWindow()
      if (!parent || parent.isDestroyed()) return Promise.resolve(false)

      const url = typeof params.url === 'string' ? params.url.trim() : ''
      const message = typeof params.message === 'string' ? params.message : ''
      const selector = typeof params.selector === 'string' ? params.selector.trim() : ''
      if (!url || !message.trim() || !selector) return Promise.resolve(false)
      let targetUrl: URL
      try {
        targetUrl = new URL(url)
      } catch {
        return Promise.resolve(false)
      }
      if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
        return Promise.resolve(false)
      }

      const [width, height] = parent.getSize()
      const child = new BrowserWindow({
        parent,
        modal: true,
        width,
        height,
        backgroundColor: SURFACE_BASE_HEX,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          partition: TICKET_EXTERNAL_APPLICATION_PARTITION
        },
        show: false
      })
      attachWindowGuards(child.webContents, { allowedOrigins: [targetUrl.origin] })

      let loadFailed = false
      let injected = false

      child.webContents.on('did-finish-load', () => {
        if (loadFailed) return
        void child.webContents
          .executeJavaScript(buildTicketExternalApplicationInjectScript(message, selector))
          .then((result) => {
            injected = result === true
            child.show()
          })
          .catch((error) => {
            logMainError('ticket-external-application-inject', error)
            child.show()
          })
      })

      child.webContents.on(
        'did-fail-load',
        (_event, _code, _description, validatedUrl, isMainFrame) => {
          if (!isMainFrame) return
          loadFailed = true
          void child
            .loadURL(
              `data:text/html;charset=utf-8,${encodeURIComponent(
                buildTicketExternalApplicationErrorHtml(validatedUrl || url)
              )}`
            )
            .then(() => child.show())
            .catch((error) => {
              logMainError('ticket-external-application-error-page', error)
              if (!child.isDestroyed()) child.close()
            })
        }
      )

      return new Promise<boolean>((resolve) => {
        child.on('closed', () => resolve(injected && !loadFailed))
        void child.loadURL(url).catch((error) => {
          logMainError('ticket-external-application-load', error)
          if (!child.isDestroyed()) child.close()
        })
      })
    }
  )
}
