import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { app, BrowserWindow, ipcMain, clipboard, session, net } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARTITION = 'persist:pierre'

let settingsPath,
  win,
  lastClipboard = '',
  clipboardInterval,
  activeStreamController = null

function readSettings() {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8'))
  } catch {
    return null
  }
}

function writeSettings(data) {
  const dir = dirname(settingsPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

function sendClipboard() {
  try {
    if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return
    const text = clipboard.readText()
    if (text && text !== lastClipboard) {
      lastClipboard = text
      win.webContents.send('clipboard-update', text)
    }
  } catch {}
}

function createWindow() {
  // Intercept Set-Cookie for 'pierre-ia' and force SameSite=None; Secure so the
  // webview (cross-site frame in Electron) can send the auth cookie on every request.
  // localhost is treated as a secure context by Chromium even over HTTP.
  const ses = session.fromPartition(PARTITION)
  ses.webRequest.onHeadersReceived((details, callback) => {
    const raw = details.responseHeaders?.['set-cookie']
    if (raw?.some((c) => c.startsWith('pierre-ia='))) {
      details.responseHeaders['set-cookie'] = raw.map((cookie) => {
        if (!cookie.startsWith('pierre-ia=')) return cookie
        return (
          cookie
            .replace(/;\s*SameSite=[^;]*/gi, '')
            .replace(/;\s*Secure\b/gi, '')
            .trimEnd() + '; SameSite=None; Secure'
        )
      })
    }
    callback({ responseHeaders: details.responseHeaders })
  })

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

  win = new BrowserWindow({
    width: 480,
    height: 840,
    minWidth: 360,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      partition: PARTITION,
      webSecurity: app.isPackaged
    },
    show: false
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  win.on('focus', sendClipboard)

  win.webContents.on('did-finish-load', () => {
    const text = clipboard.readText()
    if (text) {
      win.webContents.send('clipboard-update', text)
      lastClipboard = text
    }
  })

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  settingsPath = join(app.getPath('userData'), 'settings.json')

  // Strip dangerous options from any webview before it attaches
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-attach-webview', (_, webPreferences) => {
      delete webPreferences.preload
      delete webPreferences.preloadURL
      webPreferences.nodeIntegration = false
    })
  })

  createWindow()
  lastClipboard = clipboard.readText()
  clipboardInterval = setInterval(sendClipboard, 400)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  clearInterval(clipboardInterval)
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-settings', () => readSettings() ?? {})

ipcMain.handle('save-settings', (_, data) => {
  writeSettings(data)
  return true
})

ipcMain.handle('read-clipboard', () => clipboard.readText())

ipcMain.handle('write-clipboard', (_, text) => {
  clipboard.writeText(text)
  lastClipboard = text
  return true
})

ipcMain.handle('resize-to', (_, { width, height }) => {
  if (!win || win.isDestroyed()) return
  win.setSize(width, height, true)
})

ipcMain.handle('start-stream', async (event, { url, config, message, conv_id }) => {
  if (activeStreamController) activeStreamController.abort()
  activeStreamController = new AbortController()

  const ses = session.fromPartition(PARTITION)
  const params = new URLSearchParams({ config, message, conv_id })

  try {
    const resp = await net.fetch(`${url}/ai?${params}`, {
      signal: activeStreamController.signal,
      session: ses
    })

    if (!resp.ok || !resp.body) {
      if (!event.sender.isDestroyed())
        event.sender.send('ai-chunk', JSON.stringify({ t: 'error', d: {} }) + '\n')
      return false
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder('utf-8')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value && !event.sender.isDestroyed())
        event.sender.send('ai-chunk', decoder.decode(value, { stream: true }))
    }

    // Flush any bytes held by the decoder
    const tail = decoder.decode()
    if (tail && !event.sender.isDestroyed()) event.sender.send('ai-chunk', tail)

    return true
  } catch (e) {
    if (e.name !== 'AbortError' && !event.sender.isDestroyed())
      event.sender.send('ai-chunk', JSON.stringify({ t: 'error', d: {} }) + '\n')
    return false
  } finally {
    activeStreamController = null
  }
})

ipcMain.handle('logout', async () => {
  const ses = session.fromPartition(PARTITION)
  const cookies = await ses.cookies.get({ name: 'pierre-ia' })
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain
    await ses.cookies
      .remove(`https://${domain}`, c.name)
      .catch(() => ses.cookies.remove(`http://${domain}`, c.name).catch(() => {}))
  }
  return true
})

ipcMain.handle('cancel-stream', () => {
  if (activeStreamController) {
    activeStreamController.abort()
    activeStreamController = null
  }
})

ipcMain.handle('generate-answer', async (_, { url, conv_id, message, context, skill, files }) => {
  const ses = session.fromPartition(PARTITION)

  const formData = new FormData()
  formData.set('conv_id', conv_id)
  formData.set('message', message ?? '')
  formData.set('context', context ?? '')
  formData.set('skill', skill ?? 'skill_answer')

  if (Array.isArray(files)) {
    for (const f of files) {
      formData.append('files', new Blob([f.buffer], { type: f.type }), f.name)
    }
  }

  try {
    const resp = await net.fetch(`${url}/ai/answer`, {
      method: 'POST',
      body: formData,
      session: ses
    })

    if (!resp.ok) return { error: true }
    const data = await resp.json()
    return { content: data.content ?? '' }
  } catch {
    return { error: true }
  }
})

ipcMain.handle('get-skills', async (_, { url }) => {
  const ses = session.fromPartition(PARTITION)
  try {
    const resp = await net.fetch(`${url}/ai/skills`, { session: ses })
    if (!resp.ok) return []
    return await resp.json()
  } catch {
    return []
  }
})
