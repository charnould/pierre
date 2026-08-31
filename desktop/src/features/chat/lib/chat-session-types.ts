import type { AskUserQuestion } from '../../../../../shared/ai-stream-events'

export type ChatTextPart = {
  type: 'text'
  contentIndex: number
  text: string
}

export type ChatThinkingPart = {
  type: 'thinking'
  contentIndex: number
  thinking: string
}

export type ChatToolPart = {
  type: 'tool'
  contentIndex: number
  toolCallId?: string
  name?: string
  arguments?: unknown
  status: 'input-streaming' | 'running' | 'success' | 'error'
  output?: unknown
}

export type ChatMessagePart = ChatTextPart | ChatThinkingPart | ChatToolPart

export type Message = {
  id: string
  role: 'user' | 'assistant'
  parts: ChatMessagePart[]
  reasoningDuration?: number
  /** Offset for Pi assistant messages whose content indexes restart at zero after tools. */
  contentBase?: number
  segmentFinalized?: boolean
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error' | 'stopped'

export type PendingQuestionnaire = {
  requestId: string
  toolCallId: string
  responseSecret: string
  questions: AskUserQuestion[]
}

export function isChatGenerating(status: ChatStatus): boolean {
  return status === 'submitted' || status === 'streaming'
}

export type ChatConfig = {
  url: string
  convId: string
  configId: string
  dataParam: string
}
