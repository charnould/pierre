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
    reset: 'reset-ui-settings'
  },
  auth: {
    login: 'login',
    loginStored: 'login-stored',
    logout: 'logout',
    getChatBoot: 'get-chat-boot',
    getSkills: 'get-skills'
  },
  stream: {
    start: 'start-stream',
    generateAnswer: 'generate-answer',
    postUiResponse: 'post-ai-ui-response',
    cancel: 'cancel-stream',
    releaseConversationVm: 'release-conversation-vm'
  },
  tickets: {
    list: 'get-tickets',
    facets: 'get-ticket-facets',
    putTicket: 'put-ticket',
    getDraft: 'get-ticket-draft'
  },
  ledger: {
    list: 'get-ledger',
    repaymentTimeline: 'get-repayment-timeline'
  },
  datastore: {
    tables: 'get-datastore-tables'
  },
  users: {
    list: 'get-users',
    patchPreferences: 'patch-my-preferences',
    getAvatar: 'get-avatar',
    uploadAvatar: 'upload-avatar',
    pickAvatar: 'pick-avatar'
  },
  activities: {
    list: 'get-activities',
    syncFeed: 'sync-activity-feed',
    create: 'create-activity',
    sendCommunication: 'send-communication',
    patch: 'patch-activity',
    delete: 'delete-activity'
  },
  automations: {
    list: 'get-automations',
    create: 'create-automation',
    patch: 'patch-automation',
    delete: 'delete-automation',
    run: 'run-automation',
    pin: 'pin-automation',
    unpin: 'unpin-automation'
  },
  bulkOperations: {
    list: 'get-bulk-operations',
    get: 'get-bulk-operation',
    create: 'create-bulk-operation',
    patch: 'patch-bulk-operation',
    delete: 'delete-bulk-operation',
    execute: 'execute-bulk-operation',
    reports: 'get-bulk-operation-reports',
    previewQuery: 'preview-bulk-operation-query',
    previewMessage: 'preview-bulk-operation-message'
  },
  system: {
    writeClipboard: 'write-clipboard',
    openExternal: 'open-external',
    openAutomationReport: 'open-automation-report',
    setAuthWindowLayout: 'set-auth-window-layout',
    authWindowLayoutSwapAck: 'auth-window-layout-swap-ack',
    resetWindowToFactory: 'reset-window-to-factory',
    fetchUrl: 'fetch-url',
    getAppVersion: 'get-app-version',
    checkForAppUpdates: 'check-for-app-updates',
    findInPage: 'find-in-page',
    stopFindInPage: 'stop-find-in-page'
  },
  mascot: {
    setUnreadCount: 'mascot-set-unread-count',
    activate: 'mascot-activate',
    setBounds: 'mascot-set-bounds',
    setEnabled: 'mascot-set-enabled',
    setSize: 'mascot-set-size',
    setLook: 'mascot-set-look',
    showMenu: 'mascot-show-menu',
    syncVisibility: 'mascot-sync-visibility'
  }
} as const

/** Event channel for streamed AI chunks (not invoke/handle). */
export function aiChunkEventChannel(requestId: string): string {
  return `ai-chunk:${requestId}`
}

/** Main → mascot window: unread notification count. */
export const MascotUnreadCountEvent = 'mascot:unread-count'

/** Main → mascot window: shape + color. */
export const MascotLookEvent = 'mascot:look'

/** Main → main renderer: open the activity notifications rail. */
export const MascotOpenNotificationsEvent = 'mascot:open-notifications'

/** Main → main renderer: result of `webContents.findInPage`. */
export const FoundInPageEvent = 'found-in-page'

/** Main → renderer: swap login/session UI while the window shell is frozen. */
export const AuthWindowLayoutSwapEvent = 'auth-window-layout-swap'
