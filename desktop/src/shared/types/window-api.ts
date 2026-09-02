import type { LoginResult } from '@/shared/lib/login-errors'
import type {
  TicketsTableSettings,
  UiSettings,
  WorkflowSettings
} from '@/shared/lib/ui-settings/schema'

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
  SendCommunicationPayload
} from './activites'
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
} from './automations'
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
} from './bulk-operations'
import type { ChatBootData, SkillSummary } from './chat'
import type { DatastoreTablesResponse } from './datastore-tables'
import type {
  LedgerListResponse,
  LedgerQueryParams,
  RepaymentTimelineQueryParams,
  RepaymentTimelineResponse
} from './ledger'
import type { Settings } from './settings'
import type { GetTicketDraftResult } from './ticket-draft'
import type {
  TicketsFacetsResponse,
  TicketsListResponse,
  TicketsQueryParams,
  PutTicketPayload,
  PutTicketResult
} from './tickets'
import type {
  GetAvatarPayload,
  PatchMyPreferencesPayload,
  PatchMyPreferencesResponse,
  PickedAvatarImage,
  UploadMyAvatarPayload,
  UploadMyAvatarResponse,
  UsersListResponse
} from './users'

declare global {
  interface Window {
    api: {
      /** Read `settings.json` from the main process userData dir. */
      getSettings: () => Promise<Settings>
      saveSettings: (data: Settings) => Promise<boolean>
      /** Merged UI settings from `{userData}/ui-settings.json`. */
      getUiSettings: () => Promise<UiSettings>
      /** Raw file contents for the JSON editor. */
      getUiSettingsFile: () => Promise<string>
      /** Replaces `ui-settings.json` with the parsed document (not a merge). */
      saveUiSettings: (data: unknown) => Promise<UiSettings>
      /** Replaces `ui-settings.json` with factory defaults (`{}`). */
      resetUiSettings: () => Promise<UiSettings>
      getUiSettingsPath: () => Promise<string>
      /** `POST /a/login` with Accept: application/json — same session as `/ai/boot`. */
      login: (params: { url: string; email: string; password: string }) => Promise<LoginResult>
      /** Login with the password that stays in the main-process store. */
      loginStored: () => Promise<LoginResult>
      writeClipboard: (text: string) => Promise<boolean>
      /** Open a URL in the system browser (ERP deep links from the tickets table). */
      openExternal: (url: string) => Promise<boolean>
      /** Open an automation HTML report in a modal window (offline shell). */
      openAutomationReport: (params: { html: string }) => Promise<boolean>
      /** Compact login shell vs restored session window size (login size is not persisted). */
      setAuthWindowLayout: (params: { loggedIn: boolean }) => Promise<void>
      /** Fired while the shell is frozen — commit login/session UI, then ack. */
      onAuthWindowLayoutSwap: (cb: (params: { loggedIn: boolean }) => void) => () => void
      ackAuthWindowLayoutSwap: () => void
      resetWindowToFactory: () => Promise<boolean>
      /** HTTPS GET via main process (mises à jour GitHub raw). */
      fetchUrl: (url: string) => Promise<string | null>
      /** Installed app version from `app.getVersion()`. */
      getAppVersion: () => Promise<string>
      /** Triggers `autoUpdater.checkForUpdates()` on packaged Windows; otherwise `false`. */
      checkForAppUpdates: () => Promise<boolean>
      /** Highlight matches in the main window via Electron `webContents.findInPage`. */
      findInPage: (
        text: string,
        options?: {
          forward?: boolean
          findNext?: boolean
          matchCase?: boolean
        }
      ) => Promise<number>
      stopFindInPage: (
        action: 'clearSelection' | 'keepSelection' | 'activateSelection'
      ) => Promise<boolean>
      onFoundInPage: (
        cb: (result: {
          requestId: number
          activeMatchOrdinal: number
          matches: number
          finalUpdate: boolean
        }) => void
      ) => () => void
      /** `GET /ai/boot` — chat session metadata. */
      getChatBoot: (params: {
        url: string
        config?: string
        data?: string
      }) => Promise<ChatBootData | null>
      /** `GET /ai` canonical structured NDJSON stream; chunks via `onAiChunk`. */
      startStream: (params: {
        requestId: string
        url: string
        config: string
        message: string
        conv_id: string
        data?: string
        files?: Array<{ name: string; type: string; buffer: ArrayBuffer }>
      }) => Promise<boolean>
      logout: () => Promise<boolean>
      /** Cancel the stream associated with a request id. */
      cancelStream: (requestId: string) => Promise<void>
      /**
       * Subscribe to request-scoped stream chunks from main.
       *
       * Returns an unsubscribe callback to avoid leaked renderer listeners.
       */
      onAiChunk: (requestId: string, cb: (chunk: string) => void) => () => void
      /** `POST /ai/answer` — same NDJSON protocol as `/ai`. */
      generateAnswer: (params: {
        requestId: string
        url: string
        conv_id: string
        payload: string
        id_skill: string
        files: Array<{ name: string; type: string; buffer: ArrayBuffer }>
      }) => Promise<boolean>
      /** `POST /ai/ui-response` — resume a pending native Pi questionnaire. */
      postAiUiResponse: (params: {
        url: string
        conv_id: string
        request_id: string
        response_secret: string
        answers: Array<{ question: string; answer: string }>
      }) => Promise<boolean>
      /** `POST /ai/vm/release` — destroy the VM for a conversation immediately. */
      releaseConversationVm: (params: { url: string; conv_id: string }) => Promise<boolean>
      getTicketDraft: (params: {
        url: string
        id_reclamation: string
        id_skill?: string
      }) => Promise<GetTicketDraftResult | null>
      /** Atomically patch only `tickets.table` settings in main process. */
      patchUiSettingsTicketsTable: (partial: Partial<TicketsTableSettings>) => Promise<UiSettings>
      /** Atomically patch only `workflow` settings in main process. */
      patchUiSettingsWorkflow: (partial: Partial<WorkflowSettings>) => Promise<UiSettings>
      /** `GET /ai/skills` — skill metadata for workflow reasoning display. */
      getSkills: (params: { url: string }) => Promise<SkillSummary[]>
      /** `GET /desktop/tickets` — paginated tickets from datastore.sqlite. */
      getTickets: (params: TicketsQueryParams) => Promise<TicketsListResponse | null>
      /** `GET /desktop/ledger` — paginated tenant balances from datastore.sqlite. */
      getLedger: (params: LedgerQueryParams) => Promise<LedgerListResponse | null>
      /** One repayment tenant timeline payload: movements, activities and open actions. */
      getRepaymentTimeline: (
        params: RepaymentTimelineQueryParams
      ) => Promise<RepaymentTimelineResponse | null>
      /** `GET /desktop/tickets/facets` — distinct column values from full table. */
      getTicketFacets: (params: {
        url: string
        column: string
        q?: string
      }) => Promise<TicketsFacetsResponse | null>
      /** `PUT /desktop/tickets` — upsert reclamation row in datastore.sqlite. */
      putTicket: (params: { url: string } & PutTicketPayload) => Promise<PutTicketResult | null>
      /** `GET /desktop/datastore/tables` — datastore table presence in datastore.sqlite. */
      getDatastoreTables: (params: { url: string }) => Promise<DatastoreTablesResponse | null>
      /** `GET /desktop/users` — org users for mentions / collaborator pickers. */
      getUsers: (params: { url: string }) => Promise<UsersListResponse | null>
      /** `PATCH /desktop/me/preferences` — display name, or `{ avatar: null }` to reset photo. */
      patchMyPreferences: (
        params: PatchMyPreferencesPayload
      ) => Promise<PatchMyPreferencesResponse | null>
      /** `GET /desktop/avatars/:email` — stored WebP bytes, or null. */
      getAvatar: (params: GetAvatarPayload) => Promise<ArrayBuffer | null>
      /** Native photo picker; main process reads and re-encodes the file. */
      pickAvatarImage: () => Promise<PickedAvatarImage | null>
      /** `POST /desktop/me/avatar` — upload cropped WebP. */
      uploadMyAvatar: (params: UploadMyAvatarPayload) => Promise<UploadMyAvatarResponse | null>
      getActivities: (params: GetActivitiesParams) => Promise<ActivitiesListResponse | null>
      syncActivityFeed: (
        params: GetActivityFeedSyncParams
      ) => Promise<ActivityFeedSyncResult | null>
      createActivity: (params: CreateActivityPayload) => Promise<ActivityResponse | null>
      sendCommunication: (params: SendCommunicationPayload) => Promise<ActivityResponse | null>
      patchActivity: (params: PatchActivityPayload) => Promise<ActivityResponse | null>
      deleteActivity: (params: DeleteActivityPayload) => Promise<DeleteActivityResponse | null>
      getAutomations: (params: ListAutomationsParams) => Promise<AutomationsListResponse | null>
      createAutomation: (params: CreateAutomationPayload) => Promise<AutomationResponse | null>
      patchAutomation: (params: PatchAutomationPayload) => Promise<AutomationResponse | null>
      deleteAutomation: (
        params: DeleteAutomationPayload
      ) => Promise<DeleteAutomationResponse | null>
      runAutomation: (params: RunAutomationPayload) => Promise<AutomationResponse | null>
      pinAutomation: (params: PinAutomationPayload) => Promise<AutomationResponse | null>
      unpinAutomation: (params: PinAutomationPayload) => Promise<AutomationResponse | null>
      getBulkOperations: (
        params: ListBulkOperationsParams
      ) => Promise<BulkOperationsListResponse | null>
      getBulkOperation: (params: GetBulkOperationParams) => Promise<BulkOperationResponse | null>
      createBulkOperation: (
        params: CreateBulkOperationPayload
      ) => Promise<BulkOperationResponse | null>
      patchBulkOperation: (
        params: PatchBulkOperationPayload
      ) => Promise<BulkOperationResponse | null>
      deleteBulkOperation: (
        params: DeleteBulkOperationPayload
      ) => Promise<BulkOperationResponse | null>
      executeBulkOperation: (
        params: ExecuteBulkOperationPayload
      ) => Promise<BulkOperationExecuteResponse | null>
      getBulkOperationReports: (
        params: ListBulkOperationReportsParams
      ) => Promise<BulkOperationReportsResponse | null>
      previewBulkOperationQuery: (
        params: PreviewBulkOperationQueryPayload
      ) => Promise<BulkOperationPreviewQueryResponse | null>
      previewBulkOperationMessage: (
        params: PreviewBulkOperationMessagePayload
      ) => Promise<BulkOperationPreviewMessageResponse | null>
      /** Push unread notification count to the desktop mascot window. */
      setMascotUnreadCount: (count: number) => Promise<boolean>
      /** Mascot click — restore/focus main window and open notifications. */
      activateFromMascot: () => Promise<boolean>
      /** Move the mascot window; set `persist` to write position to ui-settings. */
      setMascotBounds: (params: {
        x?: number
        y?: number
        dx?: number
        dy?: number
        persist?: boolean
      }) => Promise<boolean>
      /** Toggle mascot visibility preference and show/hide the window. */
      setMascotEnabled: (enabled: boolean) => Promise<UiSettings>
      /** Resize the mascot window; set `persist` to write the size to ui-settings. */
      setMascotSize: (params: { size: number; persist?: boolean }) => Promise<boolean>
      /** Push shape + color to the mascot window; set `persist` to write ui-settings. */
      setMascotLook: (params: {
        shape: string
        color: string
        badgeColor: string
        persist?: boolean
      }) => Promise<boolean>
      /** Mascot right-click: open / hide / quit, the only real way out of the app. */
      showMascotMenu: () => Promise<boolean>
      /** Show the mascot only when logged in (and enabled). */
      syncMascotVisibility: (loggedIn: boolean) => Promise<boolean>
      /** Mascot window: subscribe to unread count pushes from main. */
      onMascotUnreadCount: (cb: (count: number) => void) => () => void
      /** Mascot window: subscribe to shape + color pushes from main. */
      onMascotLook: (
        cb: (look: { shape: string; color: string; badgeColor: string }) => void
      ) => () => void
      /** Main window: open notifications rail after mascot activation. */
      onOpenNotificationsFromMascot: (cb: () => void) => () => void
    }
  }
}
