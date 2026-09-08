export const TRACE_MODES = ['none', 'tools', 'collapsed', 'expanded'] as const

export type TraceMode = (typeof TRACE_MODES)[number]

export type ChatBoot = {
  convId: string
  configId: string
  dataParam: string
  disclaimer: string | null
  greeting: string[]
  examples: string[]
  displayableConfigs: { id: string; display: string; is_active: boolean }[]
  trace: TraceMode
  attachments: boolean
}

export function isTraceMode(value: unknown): value is TraceMode {
  return typeof value === 'string' && (TRACE_MODES as readonly string[]).includes(value)
}

export function showsThinking(trace: TraceMode): boolean {
  return trace === 'collapsed' || trace === 'expanded'
}

export function showsTools(trace: TraceMode): boolean {
  return trace !== 'none'
}
