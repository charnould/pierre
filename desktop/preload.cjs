const { contextBridge, ipcRenderer } = require('electron')

let _aiChunkCb = null

ipcRenderer.on('ai-chunk', (_, chunk) => {
  if (_aiChunkCb) _aiChunkCb(chunk)
})

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
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
