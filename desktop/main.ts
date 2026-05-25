import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { app, BrowserWindow, ipcMain, clipboard, session, net } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARTITION = 'persist:pierre'

let settingsPath,
  win,
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
    width: 1000,
    height: 900,
    minWidth: 360,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 10 },
    ...(iconPath ? { icon: iconPath } : {}),
    backgroundColor: '#fafaf9',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  settingsPath = join(app.getPath('userData'), 'settings.json')

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-settings', () => readSettings() ?? {})

ipcMain.handle('save-settings', (_, data) => {
  writeSettings(data)
  return true
})

ipcMain.handle('write-clipboard', (_, text) => {
  clipboard.writeText(text)
  return true
})

ipcMain.handle('resize-to', (_, { width, height }) => {
  if (!win || win.isDestroyed()) return
  win.setSize(width, height, true)
})

ipcMain.handle('get-chat-boot', async (_, { url, config, data }) => {
  const ses = session.fromPartition(PARTITION)
  const params = new URLSearchParams()
  if (config) params.set('config', config)
  if (data) params.set('data', data)
  const qs = params.toString()
  try {
    const resp = await net.fetch(`${url}/ai/boot${qs ? `?${qs}` : ''}`, { session: ses })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
})

ipcMain.handle('start-stream', async (event, { url, config, message, conv_id, data }) => {
  if (activeStreamController) activeStreamController.abort()
  activeStreamController = new AbortController()

  const ses = session.fromPartition(PARTITION)
  const params = new URLSearchParams({ config, message, conv_id, data: data ?? '' })

  try {
    const resp = await net.fetch(`${url}/ai?${params}`, {
      signal: activeStreamController.signal,
      session: ses
    })

    if (!resp.ok || !resp.body) {
      if (!event.sender.isDestroyed())
        event.sender.send('ai-chunk', JSON.stringify({ type: 'error' }) + '\n')
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
      event.sender.send('ai-chunk', JSON.stringify({ type: 'error' }) + '\n')
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

ipcMain.handle(
  'generate-answer',
  async (event, { url, conv_id, message, context, payload, skill, files }) => {
    if (activeStreamController) activeStreamController.abort()
    activeStreamController = new AbortController()

    const ses = session.fromPartition(PARTITION)

    const formData = new FormData()
    formData.set('conv_id', conv_id)
    formData.set('message', message ?? '')
    formData.set('context', context ?? '')
    if (payload) formData.set('payload', payload)
    formData.set('skill', skill ?? 'answer')

    if (Array.isArray(files)) {
      for (const f of files) {
        formData.append('files', new Blob([f.buffer], { type: f.type }), f.name)
      }
    }

    try {
      const resp = await net.fetch(`${url}/ai/answer`, {
        method: 'POST',
        body: formData,
        signal: activeStreamController.signal,
        session: ses
      })

      if (!resp.ok || !resp.body) {
        if (!event.sender.isDestroyed())
          event.sender.send('ai-chunk', JSON.stringify({ type: 'error' }) + '\n')
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

      const tail = decoder.decode()
      if (tail && !event.sender.isDestroyed()) event.sender.send('ai-chunk', tail)

      return true
    } catch (e) {
      if (e.name !== 'AbortError' && !event.sender.isDestroyed())
        event.sender.send('ai-chunk', JSON.stringify({ type: 'error' }) + '\n')
      return false
    } finally {
      activeStreamController = null
    }
  }
)

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
