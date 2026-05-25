export interface Settings {
  url?: string
  email?: string
  password?: string
  loggedOut?: boolean
}

export type ReasoningDisplay = 'off' | 'partial' | 'full'

export type SkillSummary = {
  id: string
  display: string
  reasoning_display: ReasoningDisplay
}

export type ChatBootData = {
  convId: string
  configId: string
  dataParam: string
  disclaimer: string | null
  greeting: string[]
  examples: string[]
  displayableConfigs: { id: string; display: string; is_active: boolean }[]
  assetId: string
  reasoningDisplay: ReasoningDisplay
  reasoningPlaceholders: string[]
}

declare global {
  interface Window {
    api: {
      /** Read `settings.json` from the main process userData dir. */
      getSettings: () => Promise<Settings>
      saveSettings: (data: Settings) => Promise<boolean>
      writeClipboard: (text: string) => Promise<boolean>
      resizeTo: (dims: { width: number; height: number }) => Promise<void>
      /** `GET /ai/boot` — chat session metadata. */
      getChatBoot: (params: {
        url: string
        config?: string
        data?: string
      }) => Promise<ChatBootData | null>
      /** `GET /ai` NDJSON stream; chunks via `onAiChunk` (canonical `{ type, content? }` protocol). */
      startStream: (params: {
        url: string
        config: string
        message: string
        conv_id: string
        data?: string
      }) => Promise<boolean>
      logout: () => Promise<boolean>
      cancelStream: () => Promise<void>
      /** Subscribe to stream chunks from main (`ai-chunk` event). Last registration wins. */
      onAiChunk: (cb: (chunk: string) => void) => void
      /** `POST /ai/answer` — same NDJSON protocol as `/ai`. */
      generateAnswer: (params: {
        url: string
        conv_id: string
        message?: string
        context?: string
        payload?: string
        skill: string
        files: Array<{ name: string; type: string; buffer: ArrayBuffer }>
      }) => Promise<boolean>
      /** `GET /ai/skills` — skill metadata for workflow reasoning display. */
      getSkills: (params: { url: string }) => Promise<SkillSummary[]>
    }
  }
}
