export type AskUserQuestion = {
  question: string
  choices: [string, string, string]
}

export type AskUserAnswer = {
  question: string
  answer: string
}

export type PendingAiQuestionnaire = {
  requestId: string
  toolCallId: string
  responseSecret: string
  questions: AskUserQuestion[]
}

export type AiMessageContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'toolCall'; id: string; name: string; arguments: unknown }

export type AiStreamMessage = {
  role: 'assistant'
  content: AiMessageContent[]
  [key: string]: unknown
}

/** The sole structured NDJSON contract shared by server, web, and desktop clients. */
export type AiStreamEvent =
  | { type: 'text_start'; contentIndex: number }
  | { type: 'text_delta'; contentIndex: number; delta: string }
  | { type: 'text_end'; contentIndex: number; content: string }
  | { type: 'thinking_start'; contentIndex: number }
  | { type: 'thinking_delta'; contentIndex: number; delta: string }
  | { type: 'thinking_end'; contentIndex: number; content: string }
  | { type: 'toolcall_start'; contentIndex: number; toolCallId: string; toolName: string }
  | { type: 'toolcall_delta'; contentIndex: number; delta: string }
  | {
      type: 'toolcall_end'
      contentIndex: number
      toolCall: { type: 'toolCall'; id: string; name: string; arguments: unknown }
    }
  | { type: 'message_end'; message: AiStreamMessage }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
  | {
      type: 'tool_execution_update'
      toolCallId: string
      toolName: string
      args: unknown
      partialResult: unknown
    }
  | {
      type: 'tool_execution_end'
      toolCallId: string
      toolName: string
      result: unknown
      isError: boolean
    }
  | {
      type: 'extension_ui_request'
      requestId: string
      toolCallId: string
      method: 'input'
      responseSecret: string
      questions: AskUserQuestion[]
    }
  | { type: 'attachment_uploads_ready'; files?: number; bytes?: number }
  | { type: 'stream_end' }
  | { type: 'error' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isContentIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isMessageContent(value: unknown): value is AiMessageContent {
  if (!isRecord(value)) return false
  if (value['type'] === 'text') return typeof value['text'] === 'string'
  if (value['type'] === 'thinking') return typeof value['thinking'] === 'string'
  return (
    value['type'] === 'toolCall' &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    'arguments' in value
  )
}

function isMessage(value: unknown): value is AiStreamMessage {
  return (
    isRecord(value) &&
    value['role'] === 'assistant' &&
    Array.isArray(value['content']) &&
    value['content'].every(isMessageContent)
  )
}

function isQuestion(value: unknown): value is AskUserQuestion {
  return (
    isRecord(value) &&
    typeof value['question'] === 'string' &&
    Array.isArray(value['choices']) &&
    value['choices'].length === 3 &&
    value['choices'].every((choice) => typeof choice === 'string')
  )
}

function parseAiStreamEvent(value: unknown): AiStreamEvent | null {
  if (!isRecord(value) || typeof value['type'] !== 'string') return null

  switch (value['type']) {
    case 'text_start':
    case 'thinking_start':
      return isContentIndex(value['contentIndex'])
        ? { type: value['type'], contentIndex: value['contentIndex'] }
        : null
    case 'text_delta':
    case 'thinking_delta':
    case 'toolcall_delta':
      return isContentIndex(value['contentIndex']) && typeof value['delta'] === 'string'
        ? { type: value['type'], contentIndex: value['contentIndex'], delta: value['delta'] }
        : null
    case 'text_end':
    case 'thinking_end':
      return isContentIndex(value['contentIndex']) && typeof value['content'] === 'string'
        ? { type: value['type'], contentIndex: value['contentIndex'], content: value['content'] }
        : null
    case 'toolcall_start':
      return isContentIndex(value['contentIndex']) &&
        typeof value['toolCallId'] === 'string' &&
        typeof value['toolName'] === 'string'
        ? {
            type: 'toolcall_start',
            contentIndex: value['contentIndex'],
            toolCallId: value['toolCallId'],
            toolName: value['toolName']
          }
        : null
    case 'toolcall_end':
      return isContentIndex(value['contentIndex']) &&
        isMessageContent(value['toolCall']) &&
        value['toolCall'].type === 'toolCall'
        ? { type: 'toolcall_end', contentIndex: value['contentIndex'], toolCall: value['toolCall'] }
        : null
    case 'message_end':
      return isMessage(value['message']) ? { type: 'message_end', message: value['message'] } : null
    case 'tool_execution_start':
      return typeof value['toolCallId'] === 'string' && typeof value['toolName'] === 'string'
        ? {
            type: 'tool_execution_start',
            toolCallId: value['toolCallId'],
            toolName: value['toolName'],
            args: value['args']
          }
        : null
    case 'tool_execution_update':
      return typeof value['toolCallId'] === 'string' && typeof value['toolName'] === 'string'
        ? {
            type: 'tool_execution_update',
            toolCallId: value['toolCallId'],
            toolName: value['toolName'],
            args: value['args'],
            partialResult: value['partialResult']
          }
        : null
    case 'tool_execution_end':
      return typeof value['toolCallId'] === 'string' &&
        typeof value['toolName'] === 'string' &&
        typeof value['isError'] === 'boolean'
        ? {
            type: 'tool_execution_end',
            toolCallId: value['toolCallId'],
            toolName: value['toolName'],
            result: value['result'],
            isError: value['isError']
          }
        : null
    case 'extension_ui_request':
      return typeof value['requestId'] === 'string' &&
        typeof value['toolCallId'] === 'string' &&
        typeof value['responseSecret'] === 'string' &&
        value['responseSecret'].length > 0 &&
        value['method'] === 'input' &&
        Array.isArray(value['questions']) &&
        value['questions'].length > 0 &&
        value['questions'].every(isQuestion)
        ? {
            type: 'extension_ui_request',
            requestId: value['requestId'],
            toolCallId: value['toolCallId'],
            responseSecret: value['responseSecret'],
            method: 'input',
            questions: value['questions']
          }
        : null
    case 'attachment_uploads_ready':
      return {
        type: 'attachment_uploads_ready',
        ...(typeof value['files'] === 'number' ? { files: value['files'] } : {}),
        ...(typeof value['bytes'] === 'number' ? { bytes: value['bytes'] } : {})
      }
    case 'stream_end':
    case 'error':
      return { type: value['type'] }
    default:
      return null
  }
}

/** Parses one canonical NDJSON line. Invalid, empty, and legacy lines are ignored. */
export function parseAiStreamLine(line: string): AiStreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return parseAiStreamEvent(JSON.parse(trimmed))
  } catch {
    return null
  }
}

export type AiStreamState = {
  contentByIndex: Map<number, AiMessageContent>
  text: string
  thinking: string
  pendingQuestionnaire: PendingAiQuestionnaire | null
  ended: boolean
  error: boolean
  toolCallsSeen: number
  textByIndex: Map<number, string>
  thinkingByIndex: Map<number, string>
}

export function createAiStreamState(
  initialContent: Iterable<readonly [number, AiMessageContent]> = []
): AiStreamState {
  const contentByIndex = new Map(initialContent)
  const state: AiStreamState = {
    contentByIndex,
    text: '',
    thinking: '',
    pendingQuestionnaire: null,
    ended: false,
    error: false,
    toolCallsSeen: 0,
    textByIndex: new Map(),
    thinkingByIndex: new Map()
  }
  for (const [index, part] of contentByIndex) {
    if (part.type === 'text') state.textByIndex.set(index, part.text)
    if (part.type === 'thinking') state.thinkingByIndex.set(index, part.thinking)
  }
  state.text = joinIndexed(state.textByIndex)
  state.thinking = joinIndexed(state.thinkingByIndex)
  return state
}

function joinIndexed(parts: Map<number, string>): string {
  return [...parts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, content]) => content)
    .join('')
}

/** Applies canonical display events to a compact text/thinking stream state. */
export function reduceAiStreamState(state: AiStreamState, event: AiStreamEvent): AiStreamState {
  switch (event.type) {
    case 'text_start':
      state.textByIndex.set(event.contentIndex, '')
      state.contentByIndex.set(event.contentIndex, { type: 'text', text: '' })
      break
    case 'text_delta':
      state.textByIndex.set(
        event.contentIndex,
        (state.textByIndex.get(event.contentIndex) ?? '') + event.delta
      )
      state.text = joinIndexed(state.textByIndex)
      state.contentByIndex.set(event.contentIndex, {
        type: 'text',
        text: state.textByIndex.get(event.contentIndex) ?? ''
      })
      break
    case 'text_end':
      state.textByIndex.set(event.contentIndex, event.content)
      state.text = joinIndexed(state.textByIndex)
      state.contentByIndex.set(event.contentIndex, { type: 'text', text: event.content })
      break
    case 'thinking_start':
      state.thinkingByIndex.set(event.contentIndex, '')
      state.contentByIndex.set(event.contentIndex, { type: 'thinking', thinking: '' })
      break
    case 'thinking_delta':
      state.thinkingByIndex.set(
        event.contentIndex,
        (state.thinkingByIndex.get(event.contentIndex) ?? '') + event.delta
      )
      state.thinking = joinIndexed(state.thinkingByIndex)
      state.contentByIndex.set(event.contentIndex, {
        type: 'thinking',
        thinking: state.thinkingByIndex.get(event.contentIndex) ?? ''
      })
      break
    case 'thinking_end':
      state.thinkingByIndex.set(event.contentIndex, event.content)
      state.thinking = joinIndexed(state.thinkingByIndex)
      state.contentByIndex.set(event.contentIndex, {
        type: 'thinking',
        thinking: event.content
      })
      break
    case 'toolcall_start':
      state.toolCallsSeen += 1
      state.text = ''
      state.textByIndex.clear()
      state.contentByIndex.set(event.contentIndex, {
        type: 'toolCall',
        id: event.toolCallId,
        name: event.toolName,
        arguments: undefined
      })
      break
    case 'toolcall_end':
      state.contentByIndex.set(event.contentIndex, event.toolCall)
      break
    case 'message_end':
      state.contentByIndex.clear()
      state.textByIndex.clear()
      state.thinkingByIndex.clear()
      event.message.content.forEach((part, index) => {
        state.contentByIndex.set(index, part)
        if (part.type === 'text') state.textByIndex.set(index, part.text)
        if (part.type === 'thinking') state.thinkingByIndex.set(index, part.thinking)
      })
      state.text = joinIndexed(state.textByIndex)
      state.thinking = joinIndexed(state.thinkingByIndex)
      break
    case 'extension_ui_request':
      state.pendingQuestionnaire = {
        requestId: event.requestId,
        toolCallId: event.toolCallId,
        responseSecret: event.responseSecret,
        questions: event.questions
      }
      break
    case 'attachment_uploads_ready':
      break
    case 'stream_end':
      state.ended = true
      state.pendingQuestionnaire = null
      break
    case 'error':
      state.error = true
      state.pendingQuestionnaire = null
      break
  }
  return state
}
