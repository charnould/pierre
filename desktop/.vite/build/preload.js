'use strict'
const require$$0 = require('electron')
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x
}
var preload$1 = {}
var hasRequiredPreload
function requirePreload() {
  if (hasRequiredPreload) return preload$1
  hasRequiredPreload = 1
  const { contextBridge, ipcRenderer } = require$$0
  let _clipboardCb = null
  let _aiChunkCb = null
  ipcRenderer.on('clipboard-update', (_, text) => {
    if (_clipboardCb) _clipboardCb(text)
  })
  ipcRenderer.on('ai-chunk', (_, chunk) => {
    if (_aiChunkCb) _aiChunkCb(chunk)
  })
  contextBridge.exposeInMainWorld('api', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
    onClipboardUpdate: (cb) => {
      _clipboardCb = cb
    },
    readClipboard: () => ipcRenderer.invoke('read-clipboard'),
    writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text),
    resizeTo: (dims) => ipcRenderer.invoke('resize-to', dims),
    startStream: (params) => ipcRenderer.invoke('start-stream', params),
    logout: () => ipcRenderer.invoke('logout'),
    cancelStream: () => ipcRenderer.invoke('cancel-stream'),
    onAiChunk: (cb) => {
      _aiChunkCb = cb
    },
    generateAnswer: (params) => ipcRenderer.invoke('generate-answer', params),
    getSkills: (params) => ipcRenderer.invoke('get-skills', params)
  })
  return preload$1
}
var preloadExports = requirePreload()
const preload = /* @__PURE__ */ getDefaultExportFromCjs(preloadExports)
module.exports = preload
