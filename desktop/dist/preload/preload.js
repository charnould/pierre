//#region preload.cjs
var { contextBridge, ipcRenderer } = require('electron')
var _clipboardCb = null
var _aiChunkCb = null
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
//#endregion
