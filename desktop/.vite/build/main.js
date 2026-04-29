'use strict'
const fs = require('fs')
const path = require('path')
const url = require('url')
const electron = require('electron')
var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null
const __dirname$1 = path.dirname(
  url.fileURLToPath(
    typeof document === 'undefined'
      ? require('url').pathToFileURL(__filename).href
      : (_documentCurrentScript &&
          _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' &&
          _documentCurrentScript.src) ||
          new URL('main.js', document.baseURI).href
  )
)
const PARTITION = 'persist:pierre'
let settingsPath,
  win,
  lastClipboard = '',
  clipboardInterval,
  activeStreamController = null
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
  } catch {
    return null
  }
}
function writeSettings(data) {
  const dir = path.dirname(settingsPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}
function sendClipboard() {
  try {
    if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return
    const text = electron.clipboard.readText()
    if (text && text !== lastClipboard) {
      lastClipboard = text
      win.webContents.send('clipboard-update', text)
    }
  } catch {}
}
function createWindow() {
  const ses = electron.session.fromPartition(PARTITION)
  ses.webRequest.onHeadersReceived((details, callback) => {
    var _a
    const raw = (_a = details.responseHeaders) == null ? void 0 : _a['set-cookie']
    if (raw == null ? void 0 : raw.some((c) => c.startsWith('pierre-ia='))) {
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
  win = new electron.BrowserWindow({
    width: 460,
    height: 840,
    minWidth: 360,
    minHeight: 400,
    alwaysOnTop: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname$1, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      partition: PARTITION,
      webSecurity: false
      // CORS désactivé en dev (Vite sert depuis http://localhost)
    },
    show: false
  })
  {
    win.loadURL('http://localhost:5173')
  }
  win.on('focus', sendClipboard)
  win.webContents.on('did-finish-load', () => {
    const text = electron.clipboard.readText()
    if (text) {
      win.webContents.send('clipboard-update', text)
      lastClipboard = text
    }
  })
  win.once('ready-to-show', () => win.show())
}
electron.app.whenReady().then(() => {
  settingsPath = path.join(electron.app.getPath('userData'), 'settings.json')
  electron.app.on('web-contents-created', (_, contents) => {
    contents.on('will-attach-webview', (_2, webPreferences) => {
      delete webPreferences.preload
      delete webPreferences.preloadURL
      webPreferences.nodeIntegration = false
    })
  })
  createWindow()
  lastClipboard = electron.clipboard.readText()
  clipboardInterval = setInterval(sendClipboard, 400)
  electron.app.on('activate', () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
electron.app.on('window-all-closed', () => {
  clearInterval(clipboardInterval)
  if (process.platform !== 'darwin') electron.app.quit()
})
electron.ipcMain.handle('get-settings', () => readSettings() ?? {})
electron.ipcMain.handle('save-settings', (_, data) => {
  writeSettings(data)
  return true
})
electron.ipcMain.handle('read-clipboard', () => electron.clipboard.readText())
electron.ipcMain.handle('write-clipboard', (_, text) => {
  electron.clipboard.writeText(text)
  lastClipboard = text
  return true
})
electron.ipcMain.handle('resize-to', (_, { width, height }) => {
  if (!win || win.isDestroyed()) return
  win.setSize(width, height, true)
})
electron.ipcMain.handle('start-stream', async (event, { url: url2, config, message, conv_id }) => {
  if (activeStreamController) activeStreamController.abort()
  activeStreamController = new AbortController()
  const ses = electron.session.fromPartition(PARTITION)
  const params = new URLSearchParams({ config, message, conv_id })
  try {
    const resp = await electron.net.fetch(`${url2}/ai?${params}`, {
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
electron.ipcMain.handle('logout', async () => {
  const ses = electron.session.fromPartition(PARTITION)
  const cookies = await ses.cookies.get({ name: 'pierre-ia' })
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain
    await ses.cookies
      .remove(`https://${domain}`, c.name)
      .catch(() => ses.cookies.remove(`http://${domain}`, c.name).catch(() => {}))
  }
  return true
})
electron.ipcMain.handle('cancel-stream', () => {
  if (activeStreamController) {
    activeStreamController.abort()
    activeStreamController = null
  }
})
electron.ipcMain.handle(
  'generate-answer',
  async (_, { url: url2, conv_id, message, context, skill, files }) => {
    const ses = electron.session.fromPartition(PARTITION)
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
      const resp = await electron.net.fetch(`${url2}/ai/answer`, {
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
  }
)
electron.ipcMain.handle('get-skills', async (_, { url: url2 }) => {
  const ses = electron.session.fromPartition(PARTITION)
  try {
    const resp = await electron.net.fetch(`${url2}/ai/skills`, { session: ses })
    if (!resp.ok) return []
    return await resp.json()
  } catch {
    return []
  }
})
