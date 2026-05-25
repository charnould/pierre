/** Single registry for Electron IPC channel names (wire protocol). */
export const IpcChannel = {
  settings: {
    get: 'get-settings',
    save: 'save-settings'
  },
  uiSettings: {
    get: 'get-ui-settings',
    getFile: 'get-ui-settings-file',
    save: 'save-ui-settings',
    getPath: 'get-ui-settings-path',
    patchTicketsTable: 'patch-ui-settings-tickets-table',
    patchWorkflow: 'patch-ui-settings-workflow',
    patchAutomations: 'patch-ui-settings-automations',
    patchUpdates: 'patch-ui-settings-updates',
    reset: 'reset-ui-settings'
  },
  auth: {
    login: 'login',
    logout: 'logout',
    getChatBoot: 'get-chat-boot',
    getSkills: 'get-skills'
  },
  stream: {
    start: 'start-stream',
    generateAnswer: 'generate-answer',
    cancel: 'cancel-stream',
    releaseConversationVm: 'release-conversation-vm'
  },
  tickets: {
    list: 'get-tickets',
    facets: 'get-ticket-facets',
    putDraft: 'put-ticket-draft',
    putTicket: 'put-ticket',
    getDraft: 'get-ticket-draft'
  },
  system: {
    revealUiSettings: 'reveal-ui-settings',
    writeClipboard: 'write-clipboard',
    openExternal: 'open-external',
    openInAppBrowser: 'open-in-app-browser',
    hasAravisSession: 'has-aravis-session',
    resizeTo: 'resize-to',
    resetWindowToFactory: 'reset-window-to-factory',
    fetchUrl: 'fetch-url',
    getAppVersion: 'get-app-version',
    checkForAppUpdates: 'check-for-app-updates'
  }
} as const

/** Event channel for streamed AI chunks (not invoke/handle). */
export function aiChunkEventChannel(requestId: string): string {
  return `ai-chunk:${requestId}`
}
