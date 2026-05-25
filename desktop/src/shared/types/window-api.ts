import type { LoginResult } from '@/shared/lib/login-errors'
import type {
  AutomationsSettings,
  TicketsTableSettings,
  UiSettings,
  UpdatesSettings,
  WorkflowSettings
} from '@/shared/lib/ui-settings/schema'

import type { ChatBootData, SkillSummary } from './chat'
import type { Settings } from './settings'
import type {
  GetTicketDraftResult,
  PutTicketDraftPayload,
  PutTicketDraftResult
} from './ticket-draft'
import type {
  TicketsFacetsResponse,
  TicketsListResponse,
  TicketsQueryParams,
  PutTicketPayload,
  PutTicketResult
} from './tickets'

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
      saveUiSettings: (data: unknown) => Promise<UiSettings>
      /** Replaces `ui-settings.json` with factory defaults (`{}`). */
      resetUiSettings: () => Promise<UiSettings>
      getUiSettingsPath: () => Promise<string>
      revealUiSettings: () => Promise<boolean>
      /** `POST /a/login` with Accept: application/json — same session as `/ai/boot`. */
      login: (params: { url: string; email: string; password: string }) => Promise<LoginResult>
      writeClipboard: (text: string) => Promise<boolean>
      /** Open a URL in the system browser (ERP deep links from the tickets table). */
      openExternal: (url: string) => Promise<boolean>
      /** Open a URL inside the Electron app as a modal and inject answer into #pierre-bridge-demo-answer. */
      openInAppBrowser: (params: { url: string; answer: string }) => Promise<boolean>
      /** True when the persistent Aravis session partition has cookies for the login URL origin. */
      hasAravisSession: (loginUrl: string) => Promise<boolean>
      resizeTo: (dims: { width: number; height: number }) => Promise<void>
      resetWindowToFactory: () => Promise<boolean>
      /** HTTPS GET via main process (mises à jour GitHub raw). */
      fetchUrl: (url: string) => Promise<string | null>
      /** Installed app version from `app.getVersion()`. */
      getAppVersion: () => Promise<string>
      /** Triggers `autoUpdater.checkForUpdates()` on packaged Windows; otherwise `false`. */
      checkForAppUpdates: () => Promise<boolean>
      /** `GET /ai/boot` — chat session metadata. */
      getChatBoot: (params: {
        url: string
        config?: string
        data?: string
      }) => Promise<ChatBootData | null>
      /** `GET /ai` NDJSON stream; chunks via `onAiChunk` (canonical `{ type, content? }` protocol). */
      startStream: (params: {
        requestId: string
        url: string
        config: string
        message: string
        conv_id: string
        data?: string
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
      /** `POST /ai/vm/release` — destroy the VM for a conversation immediately. */
      releaseConversationVm: (params: { url: string; conv_id: string }) => Promise<boolean>
      putTicketDraft: (
        params: { url: string } & PutTicketDraftPayload
      ) => Promise<PutTicketDraftResult | null>
      getTicketDraft: (params: {
        url: string
        id_reclamation: string
        id_skill?: string
      }) => Promise<GetTicketDraftResult | null>
      /** Atomically patch only `tickets.table` settings in main process. */
      patchUiSettingsTicketsTable: (partial: Partial<TicketsTableSettings>) => Promise<UiSettings>
      /** Atomically patch only `workflow` settings in main process. */
      patchUiSettingsWorkflow: (partial: Partial<WorkflowSettings>) => Promise<UiSettings>
      /** Atomically patch only `automations` settings in main process. */
      patchUiSettingsAutomations: (partial: Partial<AutomationsSettings>) => Promise<UiSettings>
      /** Atomically patch only `updates` settings in main process. */
      patchUiSettingsUpdates: (partial: Partial<UpdatesSettings>) => Promise<UiSettings>
      /** `GET /ai/skills` — skill metadata for workflow reasoning display. */
      getSkills: (params: { url: string }) => Promise<SkillSummary[]>
      /** `GET /desktop/tickets` — paginated tickets from datastore.sqlite. */
      getTickets: (params: TicketsQueryParams) => Promise<TicketsListResponse | null>
      /** `GET /desktop/tickets/facets` — distinct column values from full table. */
      getTicketFacets: (params: {
        url: string
        column: string
        q?: string
      }) => Promise<TicketsFacetsResponse | null>
      /** `PUT /desktop/tickets` — upsert reclamation row in datastore.sqlite. */
      putTicket: (params: { url: string } & PutTicketPayload) => Promise<PutTicketResult | null>
    }
  }
}

export {}
