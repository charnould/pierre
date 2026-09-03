import { contextBridge, ipcRenderer } from 'electron'

import {
  AuthWindowLayoutSwapEvent,
  FoundInPageEvent,
  IpcChannel,
  aiChunkEventChannel,
  MascotLookEvent,
  MascotOpenNotificationsEvent,
  MascotUnreadCountEvent
} from '../electron/ipc/channels'
import type { LoginResult } from '../src/shared/lib/login-errors'
import type {
  TicketsTableSettings,
  UiSettings,
  WorkflowSettings
} from '../src/shared/lib/ui-settings/schema'
import type {
  ActivitiesListResponse,
  ActivityFeedSyncResult,
  ActivityResponse,
  CreateActivityPayload,
  DeleteActivityPayload,
  DeleteActivityResponse,
  GetActivitiesParams,
  GetActivityFeedSyncParams,
  PatchActivityPayload,
  RecordExternalCommunicationPayload,
  SendCommunicationPayload,
  SendCommunicationResponse
} from '../src/shared/types/activites'
import type {
  AutomationResponse,
  AutomationsListResponse,
  CreateAutomationPayload,
  DeleteAutomationPayload,
  DeleteAutomationResponse,
  ListAutomationsParams,
  PatchAutomationPayload,
  PinAutomationPayload,
  RunAutomationPayload
} from '../src/shared/types/automations'
import type {
  BulkOperationExecuteResponse,
  BulkOperationReportsResponse,
  BulkOperationPreviewMessageResponse,
  BulkOperationPreviewQueryResponse,
  BulkOperationResponse,
  BulkOperationsListResponse,
  CreateBulkOperationPayload,
  DeleteBulkOperationPayload,
  ExecuteBulkOperationPayload,
  GetBulkOperationParams,
  ListBulkOperationsParams,
  ListBulkOperationReportsParams,
  PatchBulkOperationPayload,
  PreviewBulkOperationMessagePayload,
  PreviewBulkOperationQueryPayload
} from '../src/shared/types/bulk-operations'
import type { ChatBoot } from '../src/shared/types/chat'
import type { DatastoreTablesResponse } from '../src/shared/types/datastore-tables'
import type {
  KnowledgeBuildResponse,
  KnowledgeBuildsResponse,
  KnowledgeEntry,
  KnowledgeResponse,
  KnowledgeSourceResponse,
  KnowledgeUploadResponse
} from '../src/shared/types/knowledge'
import type {
  LedgerListResponse,
  LedgerMetaResponse,
  LedgerQueryParams,
  RepaymentTimelineQueryParams,
  RepaymentTimelineResponse
} from '../src/shared/types/ledger'
import type { Settings } from '../src/shared/types/settings'
import type { GetTicketDraftResult } from '../src/shared/types/ticket-draft'
import type {
  PutTicketPayload,
  PutTicketResult,
  TicketsFacetsResponse,
  TicketsListResponse,
  TicketsMetaResponse,
  TicketsQueryParams
} from '../src/shared/types/tickets'
import type {
  AdminUserMutationResponse,
  AdminUserProfileMutationResponse,
  AdminUsersResponse,
  DeleteAdminUserProfileResponse,
  DeleteAdminUserResponse,
  GetAvatarPayload,
  ImportAdminUsersResponse,
  PatchAdminUserPayload,
  PatchAdminUserProfilePayload,
  PatchMyPreferencesPayload,
  PatchMyPreferencesResponse,
  PickedAvatarImage,
  SaveAdminUserPayload,
  SaveAdminUserProfilePayload,
  UploadMyAvatarPayload,
  UploadMyAvatarResponse,
  UsersListResponse
} from '../src/shared/types/users'

const aiChunkSubscriptions = new Map<
  string,
  { channel: string; listener: (_event: unknown, chunk: string) => void }
>()

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke(IpcChannel.settings.get) as Promise<Settings>,
  saveSettings: (data: Settings) =>
    ipcRenderer.invoke(IpcChannel.settings.save, data) as Promise<boolean>,
  getUiSettings: () => ipcRenderer.invoke(IpcChannel.uiSettings.get) as Promise<UiSettings>,
  getUiSettingsFile: () => ipcRenderer.invoke(IpcChannel.uiSettings.getFile) as Promise<string>,
  saveUiSettings: (data: unknown) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.save, data) as Promise<UiSettings>,
  resetUiSettings: () => ipcRenderer.invoke(IpcChannel.uiSettings.reset) as Promise<UiSettings>,
  getUiSettingsPath: () => ipcRenderer.invoke(IpcChannel.uiSettings.getPath) as Promise<string>,
  writeClipboard: (text: string) =>
    ipcRenderer.invoke(IpcChannel.system.writeClipboard, text) as Promise<boolean>,
  openExternal: (url: string) =>
    ipcRenderer.invoke(IpcChannel.system.openExternal, url) as Promise<boolean>,
  openAutomationReport: (params: { html: string }) =>
    ipcRenderer.invoke(IpcChannel.system.openAutomationReport, params) as Promise<boolean>,
  openExternalApplication: (params: {
    transport: 'browser' | 'external'
    url: string
    clipboard?: string
    selector?: string
  }) => ipcRenderer.invoke(IpcChannel.system.openExternalApplication, params) as Promise<boolean>,
  setAuthWindowLayout: (params: { loggedIn: boolean }) =>
    ipcRenderer.invoke(IpcChannel.system.setAuthWindowLayout, params) as Promise<void>,
  onAuthWindowLayoutSwap: (cb: (params: { loggedIn: boolean }) => void) => {
    const listener = (_: unknown, params: { loggedIn: boolean }) => cb(params)
    ipcRenderer.on(AuthWindowLayoutSwapEvent, listener)
    return () => {
      ipcRenderer.removeListener(AuthWindowLayoutSwapEvent, listener)
    }
  },
  ackAuthWindowLayoutSwap: () => {
    ipcRenderer.send(IpcChannel.system.authWindowLayoutSwapAck)
  },
  resetWindowToFactory: () =>
    ipcRenderer.invoke(IpcChannel.system.resetWindowToFactory) as Promise<boolean>,
  fetchUrl: (url: string) =>
    ipcRenderer.invoke(IpcChannel.system.fetchUrl, url) as Promise<string | null>,
  getAppVersion: () => ipcRenderer.invoke(IpcChannel.system.getAppVersion) as Promise<string>,
  checkForAppUpdates: () =>
    ipcRenderer.invoke(IpcChannel.system.checkForAppUpdates) as Promise<boolean>,
  findInPage: (
    text: string,
    options?: {
      forward?: boolean
      findNext?: boolean
      matchCase?: boolean
    }
  ) => ipcRenderer.invoke(IpcChannel.system.findInPage, text, options) as Promise<number>,
  stopFindInPage: (action: 'clearSelection' | 'keepSelection' | 'activateSelection') =>
    ipcRenderer.invoke(IpcChannel.system.stopFindInPage, action) as Promise<boolean>,
  onFoundInPage: (
    cb: (result: {
      requestId: number
      activeMatchOrdinal: number
      matches: number
      finalUpdate: boolean
    }) => void
  ) => {
    const listener = (
      _: unknown,
      result: {
        requestId: number
        activeMatchOrdinal: number
        matches: number
        finalUpdate: boolean
      }
    ) => cb(result)
    ipcRenderer.on(FoundInPageEvent, listener)
    return () => {
      ipcRenderer.removeListener(FoundInPageEvent, listener)
    }
  },
  login: (params: { url: string; email: string; password: string }) =>
    ipcRenderer.invoke(IpcChannel.auth.login, params) as Promise<LoginResult>,
  restoreSession: () => ipcRenderer.invoke(IpcChannel.auth.restoreSession) as Promise<LoginResult>,
  getChatBoot: (params: { url: string; config?: string }) =>
    ipcRenderer.invoke(IpcChannel.auth.getChatBoot, params) as Promise<ChatBoot | null>,
  startStream: (params: {
    requestId: string
    url: string
    config: string
    message: string
    conv_id: string
    data?: string
    files?: Array<{ name: string; type: string; buffer: ArrayBuffer }>
  }) => ipcRenderer.invoke(IpcChannel.stream.start, params) as Promise<boolean>,
  logout: () => ipcRenderer.invoke(IpcChannel.auth.logout) as Promise<boolean>,
  cancelStream: (requestId: string) =>
    ipcRenderer.invoke(IpcChannel.stream.cancel, requestId) as Promise<void>,
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
  generateAnswer: (params: {
    requestId: string
    url: string
    conv_id: string
    payload: string
    id_skill: string
    files: Array<{ name: string; type: string; buffer: ArrayBuffer }>
  }) => ipcRenderer.invoke(IpcChannel.stream.generateAnswer, params) as Promise<boolean>,
  postAiUiResponse: (params: {
    url: string
    conv_id: string
    request_id: string
    response_secret: string
    answers: Array<{ question: string; answer: string }>
  }) => ipcRenderer.invoke(IpcChannel.stream.postUiResponse, params) as Promise<boolean>,
  releaseConversationVm: (params: { url: string; conv_id: string }) =>
    ipcRenderer.invoke(IpcChannel.stream.releaseConversationVm, params) as Promise<boolean>,
  patchUiSettingsTicketsTable: (partial: Partial<TicketsTableSettings>) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.patchTicketsTable, partial) as Promise<UiSettings>,
  patchUiSettingsWorkflow: (partial: Partial<WorkflowSettings>) =>
    ipcRenderer.invoke(IpcChannel.uiSettings.patchWorkflow, partial) as Promise<UiSettings>,
  getTickets: (params: TicketsQueryParams) =>
    ipcRenderer.invoke(IpcChannel.tickets.list, params) as Promise<TicketsListResponse | null>,
  getTicketsMeta: (params: TicketsQueryParams) =>
    ipcRenderer.invoke(IpcChannel.tickets.meta, params) as Promise<TicketsMetaResponse | null>,
  getLedger: (params: LedgerQueryParams) =>
    ipcRenderer.invoke(IpcChannel.ledger.list, params) as Promise<LedgerListResponse | null>,
  getLedgerMeta: (params: LedgerQueryParams) =>
    ipcRenderer.invoke(IpcChannel.ledger.meta, params) as Promise<LedgerMetaResponse | null>,
  getRepaymentTimeline: (params: RepaymentTimelineQueryParams) =>
    ipcRenderer.invoke(
      IpcChannel.ledger.repaymentTimeline,
      params
    ) as Promise<RepaymentTimelineResponse | null>,
  getTicketFacets: (params: { url: string; column: string; q?: string }) =>
    ipcRenderer.invoke(IpcChannel.tickets.facets, params) as Promise<TicketsFacetsResponse | null>,
  putTicket: (params: { url: string } & PutTicketPayload) =>
    ipcRenderer.invoke(IpcChannel.tickets.putTicket, params) as Promise<PutTicketResult | null>,
  getTicketDraft: (params: { url: string; id_reclamation: string; id_skill?: string }) =>
    ipcRenderer.invoke(IpcChannel.tickets.getDraft, params) as Promise<GetTicketDraftResult | null>,
  getSetup: (params: { url: string }) => ipcRenderer.invoke(IpcChannel.setup.get, params),
  getSetupFile: (params: { url: string; id: string }) =>
    ipcRenderer.invoke(IpcChannel.setup.file, params) as Promise<ArrayBuffer | null>,
  getAdminSetup: (params: { url: string }) =>
    ipcRenderer.invoke(IpcChannel.setup.adminGet, params) as Promise<{
      texts: Record<string, string | null>
      binaries: string[]
      ready: Record<string, boolean>
    } | null>,
  putAdminSetup: (params: { url: string; id: string; body?: string; bytes?: Uint8Array }) =>
    ipcRenderer.invoke(IpcChannel.setup.adminPut, params) as Promise<{
      data: { id: string }
    } | null>,
  deleteAdminChatbot: (params: { url: string; id: string }) =>
    ipcRenderer.invoke(IpcChannel.setup.adminDelete, params) as Promise<{
      data: { id: string }
    } | null>,
  getDatastoreTables: (params: { url: string }) =>
    ipcRenderer.invoke(
      IpcChannel.datastore.tables,
      params
    ) as Promise<DatastoreTablesResponse | null>,
  getUsers: (params: { url: string }) =>
    ipcRenderer.invoke(IpcChannel.users.list, params) as Promise<UsersListResponse | null>,
  getAdminUsers: (params: { url: string }) =>
    ipcRenderer.invoke(IpcChannel.users.adminList, params) as Promise<AdminUsersResponse | null>,
  createAdminUser: (params: SaveAdminUserPayload) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminCreate,
      params
    ) as Promise<AdminUserMutationResponse | null>,
  patchAdminUser: (params: PatchAdminUserPayload) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminPatch,
      params
    ) as Promise<AdminUserMutationResponse | null>,
  deleteAdminUser: (params: { url: string; email: string }) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminDelete,
      params
    ) as Promise<DeleteAdminUserResponse | null>,
  importAdminUsersCsv: (params: { url: string }) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminImportCsv,
      params
    ) as Promise<ImportAdminUsersResponse | null>,
  createAdminUserProfile: (params: SaveAdminUserProfilePayload) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminCreateProfile,
      params
    ) as Promise<AdminUserProfileMutationResponse | null>,
  patchAdminUserProfile: (params: PatchAdminUserProfilePayload) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminPatchProfile,
      params
    ) as Promise<AdminUserProfileMutationResponse | null>,
  deleteAdminUserProfile: (params: { url: string; id: string }) =>
    ipcRenderer.invoke(
      IpcChannel.users.adminDeleteProfile,
      params
    ) as Promise<DeleteAdminUserProfileResponse | null>,
  getAdminKnowledge: (params: { url: string }) =>
    ipcRenderer.invoke(IpcChannel.knowledge.get, params) as Promise<KnowledgeResponse | null>,
  uploadKnowledgeSources: (params: { url: string }) =>
    ipcRenderer.invoke(
      IpcChannel.knowledge.upload,
      params
    ) as Promise<KnowledgeUploadResponse | null>,
  patchKnowledgeSource: (params: {
    url: string
    id: string
    entries: KnowledgeEntry[]
    updatedAt: string
  }) =>
    ipcRenderer.invoke(
      IpcChannel.knowledge.patch,
      params
    ) as Promise<KnowledgeSourceResponse | null>,
  deleteKnowledgeSource: (params: { url: string; id: string }) =>
    ipcRenderer.invoke(IpcChannel.knowledge.delete, params) as Promise<boolean>,
  downloadKnowledgeSource: (params: { url: string; id: string; originalName: string }) =>
    ipcRenderer.invoke(IpcChannel.knowledge.download, params) as Promise<boolean>,
  getKnowledgeBuilds: (params: { url: string }) =>
    ipcRenderer.invoke(
      IpcChannel.knowledge.builds,
      params
    ) as Promise<KnowledgeBuildsResponse | null>,
  rebuildKnowledge: (params: { url: string }) =>
    ipcRenderer.invoke(
      IpcChannel.knowledge.rebuild,
      params
    ) as Promise<KnowledgeBuildResponse | null>,
  patchMyPreferences: (params: PatchMyPreferencesPayload) =>
    ipcRenderer.invoke(
      IpcChannel.users.patchPreferences,
      params
    ) as Promise<PatchMyPreferencesResponse | null>,
  getAvatar: (params: GetAvatarPayload) =>
    ipcRenderer.invoke(IpcChannel.users.getAvatar, params) as Promise<ArrayBuffer | null>,
  pickAvatarImage: () =>
    ipcRenderer.invoke(IpcChannel.users.pickAvatar) as Promise<PickedAvatarImage | null>,
  uploadMyAvatar: (params: UploadMyAvatarPayload) =>
    ipcRenderer.invoke(
      IpcChannel.users.uploadAvatar,
      params
    ) as Promise<UploadMyAvatarResponse | null>,
  getActivities: (params: GetActivitiesParams) =>
    ipcRenderer.invoke(
      IpcChannel.activities.list,
      params
    ) as Promise<ActivitiesListResponse | null>,
  syncActivityFeed: (params: GetActivityFeedSyncParams) =>
    ipcRenderer.invoke(
      IpcChannel.activities.syncFeed,
      params
    ) as Promise<ActivityFeedSyncResult | null>,
  createActivity: (params: CreateActivityPayload) =>
    ipcRenderer.invoke(IpcChannel.activities.create, params) as Promise<ActivityResponse | null>,
  recordExternalCommunication: (params: RecordExternalCommunicationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.activities.recordExternalCommunication,
      params
    ) as Promise<ActivityResponse | null>,
  sendCommunication: (params: SendCommunicationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.activities.sendCommunication,
      params
    ) as Promise<SendCommunicationResponse | null>,
  patchActivity: (params: PatchActivityPayload) =>
    ipcRenderer.invoke(IpcChannel.activities.patch, params) as Promise<ActivityResponse | null>,
  deleteActivity: (params: DeleteActivityPayload) =>
    ipcRenderer.invoke(
      IpcChannel.activities.delete,
      params
    ) as Promise<DeleteActivityResponse | null>,
  getAutomations: (params: ListAutomationsParams) =>
    ipcRenderer.invoke(
      IpcChannel.automations.list,
      params
    ) as Promise<AutomationsListResponse | null>,
  createAutomation: (params: CreateAutomationPayload) =>
    ipcRenderer.invoke(IpcChannel.automations.create, params) as Promise<AutomationResponse | null>,
  patchAutomation: (params: PatchAutomationPayload) =>
    ipcRenderer.invoke(IpcChannel.automations.patch, params) as Promise<AutomationResponse | null>,
  deleteAutomation: (params: DeleteAutomationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.automations.delete,
      params
    ) as Promise<DeleteAutomationResponse | null>,
  runAutomation: (params: RunAutomationPayload) =>
    ipcRenderer.invoke(IpcChannel.automations.run, params) as Promise<AutomationResponse | null>,
  pinAutomation: (params: PinAutomationPayload) =>
    ipcRenderer.invoke(IpcChannel.automations.pin, params) as Promise<AutomationResponse | null>,
  unpinAutomation: (params: PinAutomationPayload) =>
    ipcRenderer.invoke(IpcChannel.automations.unpin, params) as Promise<AutomationResponse | null>,
  getBulkOperations: (params: ListBulkOperationsParams) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.list,
      params
    ) as Promise<BulkOperationsListResponse | null>,
  getBulkOperation: (params: GetBulkOperationParams) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.get,
      params
    ) as Promise<BulkOperationResponse | null>,
  createBulkOperation: (params: CreateBulkOperationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.create,
      params
    ) as Promise<BulkOperationResponse | null>,
  patchBulkOperation: (params: PatchBulkOperationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.patch,
      params
    ) as Promise<BulkOperationResponse | null>,
  deleteBulkOperation: (params: DeleteBulkOperationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.delete,
      params
    ) as Promise<BulkOperationResponse | null>,
  executeBulkOperation: (params: ExecuteBulkOperationPayload) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.execute,
      params
    ) as Promise<BulkOperationExecuteResponse | null>,
  getBulkOperationReports: (params: ListBulkOperationReportsParams) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.reports,
      params
    ) as Promise<BulkOperationReportsResponse | null>,
  previewBulkOperationQuery: (params: PreviewBulkOperationQueryPayload) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.previewQuery,
      params
    ) as Promise<BulkOperationPreviewQueryResponse | null>,
  previewBulkOperationMessage: (params: PreviewBulkOperationMessagePayload) =>
    ipcRenderer.invoke(
      IpcChannel.bulkOperations.previewMessage,
      params
    ) as Promise<BulkOperationPreviewMessageResponse | null>,
  setMascotUnreadCount: (count: number, options?: { orbit?: boolean }) =>
    ipcRenderer.invoke(IpcChannel.mascot.setUnreadCount, count, options) as Promise<boolean>,
  activateFromMascot: () => ipcRenderer.invoke(IpcChannel.mascot.activate) as Promise<boolean>,
  setMascotBounds: (params: {
    x?: number
    y?: number
    dx?: number
    dy?: number
    persist?: boolean
  }) => ipcRenderer.invoke(IpcChannel.mascot.setBounds, params) as Promise<boolean>,
  setMascotEnabled: (enabled: boolean) =>
    ipcRenderer.invoke(IpcChannel.mascot.setEnabled, enabled) as Promise<UiSettings>,
  setMascotSize: (params: { size: number; persist?: boolean }) =>
    ipcRenderer.invoke(IpcChannel.mascot.setSize, params) as Promise<boolean>,
  setMascotLook: (params: {
    shape: string
    color: string
    badgeColor: string
    persist?: boolean
  }) => ipcRenderer.invoke(IpcChannel.mascot.setLook, params) as Promise<boolean>,
  showMascotMenu: () => ipcRenderer.invoke(IpcChannel.mascot.showMenu) as Promise<boolean>,
  syncMascotVisibility: (loggedIn: boolean) =>
    ipcRenderer.invoke(IpcChannel.mascot.syncVisibility, loggedIn) as Promise<boolean>,
  onMascotUnreadCount: (cb: (count: number) => void) => {
    const listener = (_: unknown, count: number) => cb(count)
    ipcRenderer.on(MascotUnreadCountEvent, listener)
    return () => {
      ipcRenderer.removeListener(MascotUnreadCountEvent, listener)
    }
  },
  onMascotLook: (cb: (look: { shape: string; color: string; badgeColor: string }) => void) => {
    const listener = (_: unknown, next: { shape: string; color: string; badgeColor: string }) =>
      cb(next)
    ipcRenderer.on(MascotLookEvent, listener)
    return () => {
      ipcRenderer.removeListener(MascotLookEvent, listener)
    }
  },
  onOpenNotificationsFromMascot: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on(MascotOpenNotificationsEvent, listener)
    return () => {
      ipcRenderer.removeListener(MascotOpenNotificationsEvent, listener)
    }
  }
})
