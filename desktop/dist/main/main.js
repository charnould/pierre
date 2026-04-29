let fs = require('fs')
let path = require('path')
let url = require('url')
let electron = require('electron')
//#region main.ts
var __dirname$1 = (0, path.dirname)(
  (0, url.fileURLToPath)(require('url').pathToFileURL(__filename).href)
)
var PARTITION = 'persist:pierre'
var settingsPath,
  win,
  lastClipboard = '',
  clipboardInterval,
  activeStreamController = null
function readSettings() {
  try {
    return JSON.parse((0, fs.readFileSync)(settingsPath, 'utf-8'))
  } catch {
    return null
  }
}
function writeSettings(data) {
  const dir = (0, path.dirname)(settingsPath)
  if (!(0, fs.existsSync)(dir)) (0, fs.mkdirSync)(dir, { recursive: true })
  ;(0, fs.writeFileSync)(settingsPath, JSON.stringify(data, null, 2))
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
  electron.session.fromPartition(PARTITION).webRequest.onHeadersReceived((details, callback) => {
    const raw = details.responseHeaders?.['set-cookie']
    if (raw?.some((c) => c.startsWith('pierre-ia=')))
      details.responseHeaders['set-cookie'] = raw.map((cookie) => {
        if (!cookie.startsWith('pierre-ia=')) return cookie
        return (
          cookie
            .replace(/;\s*SameSite=[^;]*/gi, '')
            .replace(/;\s*Secure\b/gi, '')
            .trimEnd() + '; SameSite=None; Secure'
        )
      })
    callback({ responseHeaders: details.responseHeaders })
  })
  const iconPath = (() => {
    if (process.platform === 'win32')
      return electron.app.isPackaged
        ? (0, path.join)(process.resourcesPath, 'icons/windows/icon.ico')
        : (0, path.join)(__dirname$1, '../../src/assets/icons/windows/icon.ico')
    if (process.platform === 'linux')
      return electron.app.isPackaged
        ? (0, path.join)(process.resourcesPath, 'icons/linux/icons/512x512.png')
        : (0, path.join)(__dirname$1, '../../src/assets/icons/linux/icons/512x512.png')
  })()
  win = new electron.BrowserWindow({
    width: 480,
    height: 840,
    minWidth: 360,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: (0, path.join)(__dirname$1, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      partition: PARTITION,
      webSecurity: electron.app.isPackaged
    },
    show: false
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile((0, path.join)(__dirname$1, '../renderer/index.html'))
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
  settingsPath = (0, path.join)(electron.app.getPath('userData'), 'settings.json')
  electron.app.on('web-contents-created', (_, contents) => {
    contents.on('will-attach-webview', (_, webPreferences) => {
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
electron.ipcMain.handle('start-stream', async (event, { url: url$1, config, message, conv_id }) => {
  if (activeStreamController) activeStreamController.abort()
  activeStreamController = new AbortController()
  const ses = electron.session.fromPartition(PARTITION)
  const params = new URLSearchParams({
    config,
    message,
    conv_id
  })
  try {
    const resp = await electron.net.fetch(`${url$1}/ai?${params}`, {
      signal: activeStreamController.signal,
      session: ses
    })
    if (!resp.ok || !resp.body) {
      if (!event.sender.isDestroyed())
        event.sender.send(
          'ai-chunk',
          JSON.stringify({
            t: 'error',
            d: {}
          }) + '\n'
        )
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
      event.sender.send(
        'ai-chunk',
        JSON.stringify({
          t: 'error',
          d: {}
        }) + '\n'
      )
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
  async (_, { url: url$2, conv_id, message, context, skill, files }) => {
    const ses = electron.session.fromPartition(PARTITION)
    const formData = new FormData()
    formData.set('conv_id', conv_id)
    formData.set('message', message ?? '')
    formData.set('context', context ?? '')
    formData.set('skill', skill ?? 'skill_answer')
    if (Array.isArray(files))
      for (const f of files)
        formData.append('files', new Blob([f.buffer], { type: f.type }), f.name)
    try {
      const resp = await electron.net.fetch(`${url$2}/ai/answer`, {
        method: 'POST',
        body: formData,
        session: ses
      })
      if (!resp.ok) return { error: true }
      return { content: (await resp.json()).content ?? '' }
    } catch {
      return { error: true }
    }
  }
)
electron.ipcMain.handle('get-skills', async (_, { url: url$3 }) => {
  const ses = electron.session.fromPartition(PARTITION)
  try {
    const resp = await electron.net.fetch(`${url$3}/ai/skills`, { session: ses })
    if (!resp.ok) return []
    return await resp.json()
  } catch {
    return []
  }
})
//#endregion
