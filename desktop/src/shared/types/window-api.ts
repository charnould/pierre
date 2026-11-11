import type { LoginResult } from '@/shared/lib/login-errors'
import type {
  TicketsTableSettings,
  UiSettings,
  WorkflowSettings
} from '@/shared/lib/ui-settings/schema'
import type {
  AdminError,
  ConversationDetailResponse,
  ConversationListResponse,
  GetAdminConversationParams,
  GetLlmRunParams,
  GetLlmUsageParams,
  ListAdminConversationsParams,
  ListLlmRunsParams,
  LlmRunListResponse,
  LlmRunResponse,
  LlmUsageResponse,
  SaveAdminConversationReviewParams
} from '@/shared/types/admin-insights'

import type { RepaymentMessage } from '../../../../shared/repayment-messages'
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
} from './activites'
import type {
  AutomationApiFailure,
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
  BulkOperationPreviewMessageResponse,
  BulkOperationPreviewQueryResponse,
  BulkOperationReportsResponse,
  BulkOperationResponse,
  BulkOperationsListResponse,
  CreateBulkOperationPayload,
  DeleteBulkOperationPayload,
  ExecuteBulkOperationPayload,
  GetBulkOperationParams,
  ListBulkOperationReportsParams,
  ListBulkOperationsParams,
  PatchBulkOperationPayload,
  PreviewBulkOperationMessagePayload,
  PreviewBulkOperationQueryPayload
} from './bulk-operations'
import type { ChatBoot } from './chat'
import type { DatastoreTablesResponse } from './datastore-tables'
import type {
  KnowledgeBuildResponse,
  KnowledgeBuildsResponse,
  KnowledgeEntry,
  KnowledgeResponse,
  KnowledgeSourceResponse,
  KnowledgeUploadResponse
} from './knowledge'
import type {
  LedgerListResponse,
  LedgerMetaResponse,
  LedgerQueryParams,
  RepaymentTimelineQueryParams,
  RepaymentTimelineResponse
} from './ledger'
import type { Settings } from './settings'
import type { GetTicketDraftResult } from './ticket-draft'
import type {
  TicketsFacetsResponse,
  TicketsListResponse,
  TicketsMetaResponse,
  TicketsQueryParams
} from './tickets'
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
      /** Better Auth email/password login through the main process. */
      login: (params: { url: string; email: string; password: string }) => Promise<LoginResult>
      /** Restore the Better Auth session held by the Electron partition. */
      restoreSession: () => Promise<LoginResult>
      writeClipboard: (text: string) => Promise<boolean>
      /** Open a URL in the system browser (ERP deep links from the tickets table). */
      openExternal: (url: string) => Promise<boolean>
      /** Open an automation HTML report in a modal window (offline shell). */
      openAutomationReport: (params: { html: string }) => Promise<boolean>
      /** Open a module's external application and, when asked, copy or inject the text. */
      openExternalApplication: (params: {
        transport: 'browser' | 'external'
        url: string
        clipboard?: string
        selector?: string
      }) => Promise<boolean>
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
      /** `GET /chat/config` — chat session metadata. */
      getChatBoot: (params: { url: string; config?: string }) => Promise<ChatBoot | null>
      /** `POST /chat` canonical structured NDJSON stream; chunks via `onAiChunk`. */
      startStream: (params: {
        requestId: string
        url: string
        config: string
        message: string
        conv_id: string
        data?: string
        files?: File[]
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
      /** `POST /workflows` — same NDJSON protocol as `/chat`. */
      generateAnswer: (params: {
        requestId: string
        url: string
        conv_id: string
        payload: string
        id_skill: string
        files: File[]
      }) => Promise<boolean>
      /** `POST /chat/responses` — resume a pending native Pi questionnaire. */
      postAiUiResponse: (params: {
        url: string
        conv_id: string
        request_id: string
        response_secret: string
        answers: Array<{ question: string; answer: string }>
      }) => Promise<boolean>
      /** `DELETE /chat/sessions/:conversationId` — destroy the VM for a conversation immediately. */
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
      /** `GET /admin/providers` */
      getAdminProviders: (params: { url: string }) => Promise<{
        data: {
          ai: {
            configured: boolean
            type: string
            baseUrl: string
            model: string
            effort: string
          }
          rcs: { configured: boolean; from: string; secret: string }
          email: { configured: boolean; domain: string; account: string }
          maileva: {
            configured: boolean
            clientId: string
            username: string
            senderId: string
            address: string
            target: '' | 'sandbox' | 'production'
            postalReady: boolean
            electronicReady: boolean
            secretsReadable: boolean
          }
          webhooks: { rcs: string; email: string }
        }
      } | null>
      /** `PUT /admin/providers` */
      putAdminProviders: (params: { url: string; body: Record<string, unknown> }) => Promise<{
        data?: { rcsSecret?: string; warning?: string }
        error?: { message: string }
      } | null>
      /** `GET /admin/setup` */
      getAdminSetup: (params: { url: string }) => Promise<{
        texts: Record<string, string | null>
        binaries: string[]
        ready: Record<string, boolean>
      } | null>
      /** `PUT /admin/setup/*` */
      putAdminSetup: (params: {
        url: string
        id: string
        body?: string
        bytes?: Uint8Array
      }) => Promise<{ data?: { id: string }; error?: { message: string } } | null>
      /** `POST /admin/providers/email/test` */
      postEmailTest: (params: { url: string }) => Promise<{
        data?: { sent: true }
        error?: { message: string }
      } | null>
      verifyRepaymentMessage: (params: { url: string; text: string }) => Promise<{
        data?: RepaymentMessage
        error?: { message: string }
      } | null>
      /** `DELETE /admin/setup/chatbots/:id` */
      deleteAdminChatbot: (params: {
        url: string
        id: string
      }) => Promise<{ data: { id: string } } | null>
      /** `GET /tickets` — paginated tickets from datastore.sqlite. */
      getTickets: (params: TicketsQueryParams) => Promise<TicketsListResponse | null>
      /** `GET /tickets/meta` — ticket schema/count without row data. */
      getTicketsMeta: (params: TicketsQueryParams) => Promise<TicketsMetaResponse | null>
      /** `GET /ledger` — paginated tenant balances from datastore.sqlite. */
      getLedger: (params: LedgerQueryParams) => Promise<LedgerListResponse | null>
      /** `GET /ledger/meta` — ledger schema without row data. */
      getLedgerMeta: (params: LedgerQueryParams) => Promise<LedgerMetaResponse | null>
      /** One repayment tenant timeline payload: movements, activities and open actions. */
      getRepaymentTimeline: (
        params: RepaymentTimelineQueryParams
      ) => Promise<RepaymentTimelineResponse | null>
      exportRepaymentDocument: (params: {
        url: string
        document: 'diagnostic' | 'plan' | 'protocole'
        format: 'docx' | 'pdf'
        dossier: unknown
      }) => Promise<{ saved: true } | { canceled: true } | { error?: { message?: string } } | null>
      /** `GET /tickets/facets` — distinct column values from full table. */
      getTicketFacets: (params: {
        url: string
        column: string
        q?: string
      }) => Promise<TicketsFacetsResponse | null>
      /** `GET /setup` — instance name, module configs, templates. */
      getSetup: (params: { url: string }) => Promise<unknown>
      /** `GET /setup/*` */
      getSetupFile: (params: { url: string; id: string }) => Promise<ArrayBuffer | null>
      /** `GET /datastore` — datastore table presence in datastore.sqlite. */
      getDatastoreTables: (params: { url: string }) => Promise<DatastoreTablesResponse | null>
      /** `GET /users` — org users for mentions / collaborator pickers. */
      getUsers: (params: { url: string }) => Promise<UsersListResponse | null>
      getAdminUsers: (params: { url: string }) => Promise<AdminUsersResponse | null>
      getAdminConversations: (
        params: ListAdminConversationsParams
      ) => Promise<ConversationListResponse | AdminError | null>
      getAdminConversation: (
        params: GetAdminConversationParams
      ) => Promise<ConversationDetailResponse | AdminError | null>
      saveAdminConversationReview: (
        params: SaveAdminConversationReviewParams
      ) => Promise<ConversationDetailResponse | AdminError | null>
      getAdminLlmUsage: (params: GetLlmUsageParams) => Promise<LlmUsageResponse | AdminError | null>
      getAdminLlmRuns: (
        params: ListLlmRunsParams
      ) => Promise<LlmRunListResponse | AdminError | null>
      getAdminLlmRun: (params: GetLlmRunParams) => Promise<LlmRunResponse | AdminError | null>
      createAdminUser: (params: SaveAdminUserPayload) => Promise<AdminUserMutationResponse | null>
      patchAdminUser: (params: PatchAdminUserPayload) => Promise<AdminUserMutationResponse | null>
      deleteAdminUser: (params: {
        url: string
        email: string
      }) => Promise<DeleteAdminUserResponse | null>
      importAdminUsersCsv: (params: { url: string }) => Promise<ImportAdminUsersResponse | null>
      createAdminUserProfile: (
        params: SaveAdminUserProfilePayload
      ) => Promise<AdminUserProfileMutationResponse | null>
      patchAdminUserProfile: (
        params: PatchAdminUserProfilePayload
      ) => Promise<AdminUserProfileMutationResponse | null>
      deleteAdminUserProfile: (params: {
        url: string
        id: string
      }) => Promise<DeleteAdminUserProfileResponse | null>
      getAdminKnowledge: (params: { url: string }) => Promise<KnowledgeResponse | null>
      uploadKnowledgeSources: (params: { url: string }) => Promise<KnowledgeUploadResponse | null>
      patchKnowledgeSource: (params: {
        url: string
        id: string
        entries: KnowledgeEntry[]
        updatedAt: string
      }) => Promise<KnowledgeSourceResponse | null>
      deleteKnowledgeSource: (params: { url: string; id: string }) => Promise<boolean>
      getKnowledgeBuilds: (params: { url: string }) => Promise<KnowledgeBuildsResponse | null>
      rebuildKnowledge: (params: { url: string }) => Promise<KnowledgeBuildResponse | null>
      /** `PATCH /me/preferences` — display name, or `{ avatar: null }` to reset photo. */
      patchMyPreferences: (
        params: PatchMyPreferencesPayload
      ) => Promise<PatchMyPreferencesResponse | null>
      /** `GET /avatars/:email` — stored WebP bytes, or null. */
      getAvatar: (params: GetAvatarPayload) => Promise<ArrayBuffer | null>
      /** Native photo picker; main process reads and re-encodes the file. */
      pickAvatarImage: () => Promise<PickedAvatarImage | null>
      /** `POST /me/avatar` — upload cropped WebP. */
      uploadMyAvatar: (params: UploadMyAvatarPayload) => Promise<UploadMyAvatarResponse | null>
      getActivities: (params: GetActivitiesParams) => Promise<ActivitiesListResponse | null>
      syncActivityFeed: (
        params: GetActivityFeedSyncParams
      ) => Promise<ActivityFeedSyncResult | null>
      createActivity: (params: CreateActivityPayload) => Promise<ActivityResponse | null>
      recordExternalCommunication: (
        params: RecordExternalCommunicationPayload
      ) => Promise<ActivityResponse | null>
      sendCommunication: (
        params: SendCommunicationPayload
      ) => Promise<SendCommunicationResponse | null>
      patchActivity: (params: PatchActivityPayload) => Promise<ActivityResponse | null>
      deleteActivity: (params: DeleteActivityPayload) => Promise<DeleteActivityResponse | null>
      getAutomations: (params: ListAutomationsParams) => Promise<AutomationsListResponse | null>
      createAutomation: (
        params: CreateAutomationPayload
      ) => Promise<AutomationResponse | AutomationApiFailure | null>
      patchAutomation: (
        params: PatchAutomationPayload
      ) => Promise<AutomationResponse | AutomationApiFailure | null>
      deleteAutomation: (
        params: DeleteAutomationPayload
      ) => Promise<DeleteAutomationResponse | AutomationApiFailure | null>
      runAutomation: (
        params: RunAutomationPayload
      ) => Promise<AutomationResponse | AutomationApiFailure | null>
      pinAutomation: (
        params: PinAutomationPayload
      ) => Promise<AutomationResponse | AutomationApiFailure | null>
      unpinAutomation: (
        params: PinAutomationPayload
      ) => Promise<AutomationResponse | AutomationApiFailure | null>
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
      setMascotUnreadCount: (count: number, options?: { orbit?: boolean }) => Promise<boolean>
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
      onMascotUnreadCount: (cb: (payload: { count: number; orbit: boolean }) => void) => () => void
      /** Mascot window: subscribe to shape + color pushes from main. */
      onMascotLook: (
        cb: (look: { shape: string; color: string; badgeColor: string }) => void
      ) => () => void
      /** Main window: open notifications rail after mascot activation. */
      onOpenNotificationsFromMascot: (cb: () => void) => () => void
    }
  }
}
