export const TRACE_MODES = ['none', 'tools', 'collapsed', 'expanded'] as const

export type TraceMode = (typeof TRACE_MODES)[number]

export type ChatBoot = {
  convId: string
  configId: string
  dataParam: string
  greetings: string[]
  disclaimer: string | null
  examples: string[]
  displayableConfigs: { id: string; display: string; isActive: boolean }[]
  trace: TraceMode
  attachments: boolean
  embed?: boolean
}

export type ChatBootResponse = { data: ChatBoot }

export function isTraceMode(value: unknown): value is TraceMode {
  return typeof value === 'string' && (TRACE_MODES as readonly string[]).includes(value)
}

export function showsThinking(trace: TraceMode): boolean {
  return trace === 'collapsed' || trace === 'expanded'
}

export function showsTools(trace: TraceMode): boolean {
  return trace !== 'none'
}
