import { contextBridge, ipcRenderer } from 'electron'

import { IpcChannel, aiChunkEventChannel } from '../electron/ipc/channels'

const aiChunkSubscriptions = new Map<
  string,
  { channel: string; listener: (_event: unknown, chunk: string) => void }
>()

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke(IpcChannel.settings.get),
  saveSettings: (data: unknown) => ipcRenderer.invoke(IpcChannel.settings.save, data),
  getUiSettings: () => ipcRenderer.invoke(IpcChannel.uiSettings.get),
  getUiSettingsFile: () => ipcRenderer.invoke(IpcChannel.uiSettings.getFile),
  saveUiSettings: (data: unknown) => ipcRenderer.invoke(IpcChannel.uiSettings.save, data),
  resetUiSettings: () => ipcRenderer.invoke(IpcChannel.uiSettings.reset),
  getUiSettingsPath: () => ipcRenderer.invoke(IpcChannel.uiSettings.getPath),
  revealUiSettings: () => ipcRenderer.invoke(IpcChannel.system.revealUiSettings),
  writeClipboard: (text: string) => ipcRenderer.invoke(IpcChannel.system.writeClipboard, text),
  openExternal: (url: string) => ipcRenderer.invoke(IpcChannel.system.openExternal, url),
  openInAppBrowser: (params: { url: string; answer: string }) =>
    ipcRenderer.invoke(IpcChannel.system.openInAppBrowser, params),
  hasAravisSession: (loginUrl: string) =>
    ipcRenderer.invoke(IpcChannel.system.hasAravisSession, loginUrl),
  resizeTo: (dims: { width: number; height: number }) =>
    ipcRenderer.invoke(IpcChannel.system.resizeTo, dims),
  resetWindowToFactory: () => ipcRenderer.invoke(IpcChannel.system.resetWindowToFactory),
  fetchUrl: (url: string) => ipcRenderer.invoke(IpcChannel.system.fetchUrl, url),
  getAppVersion: () => ipcRenderer.invoke(IpcChannel.system.getAppVersion),
  checkForAppUpdates: () => ipcRenderer.invoke(IpcChannel.system.checkForAppUpdates),
  login: (params: { url: string; email: string; password: string }) =>
    ipcRenderer.invoke(IpcChannel.auth.login, params),
  getChatBoot: (params: { url: string; config?: string; data?: string }) =>
    ipcRenderer.invoke(IpcChannel.auth.getChatBoot, params),
  startStream: (params: unknown) => ipcRenderer.invoke(IpcChannel.stream.start, params),
  logout: () => ipcRenderer.invoke(IpcChannel.auth.logout),
  cancelStream: (requestId: string) => ipcRenderer.invoke(IpcChannel.stream.cancel, requestId),
  onAiChunk: (requestId: string, cb: (chunk: string) => void) => {
    const existing = aiChunkSubscriptions.get(requestId)
    if (existing) {
      ipcRenderer.removeListener(existing.channel, existing.listener)
      aiChunkSubscriptions.delete(requestId)
    }
    const channel = aiChunkEventChannel(requestId)
    const listener = (_: unknown, chunk: string) => cb(chunk)
    ipcRenderer.on(channel, listener)
    aiChunkSubscriptions.set(requestId, { channel, listener })
    return () => {
      const active = aiChunkSubscriptions.get(requestId)
      if (!active) return
      ipcRenderer.removeListener(active.channel, active.listener)
      aiChunkSubscriptions.delete(requestId)
    }
  },
  generateAnswer: (params: unknown) => ipcRenderer.invoke(IpcChannel.stream.generateAnswer, params),
  releaseConversationVm: (params: { url: string; conv_id: string }) =>
    ipcRenderer.invoke(IpcChannel.stream.releaseConversationVm, params),
  patchUiSettingsTicketsTable: (partial: unknown) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.patchTicketsTable, partial),
  patchUiSettingsWorkflow: (partial: unknown) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.patchWorkflow, partial),
  patchUiSettingsAutomations: (partial: unknown) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.patchAutomations, partial),
  patchUiSettingsUpdates: (partial: unknown) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.patchUpdates, partial),
  getSkills: (params: { url: string }) => ipcRenderer.invoke(IpcChannel.auth.getSkills, params),
  getTickets: (params: unknown) => ipcRenderer.invoke(IpcChannel.tickets.list, params),
  getTicketFacets: (params: unknown) => ipcRenderer.invoke(IpcChannel.tickets.facets, params),
  putTicketDraft: (params: unknown) => ipcRenderer.invoke(IpcChannel.tickets.putDraft, params),
  putTicket: (params: unknown) => ipcRenderer.invoke(IpcChannel.tickets.putTicket, params),
  getTicketDraft: (params: unknown) => ipcRenderer.invoke(IpcChannel.tickets.getDraft, params)
})
