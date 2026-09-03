import type { ChatMessagePart, ChatToolPart, Message } from '@/features/chat/lib/chat-session-types'
import type { AiStreamEvent } from '@/features/workflow/lib/parse-workflow-chunk'

import {
  createAiStreamState,
  reduceAiStreamState,
  type AiMessageContent
} from '../../../../../shared/ai-stream-events'

function updateLastAssistantMessage(
  messages: Message[],
  updater: (last: Message) => Message
): Message[] {
  const updated = [...messages]
  const last = updated[updated.length - 1]
  if (last?.role === 'assistant') {
    updated[updated.length - 1] = updater(last)
  }
  return updated
}

export type StreamEventResult = {
  messages: Message[]
  reasoningEndedAt: number | null
}

function maxContentIndex(parts: ChatMessagePart[]): number {
  return parts.reduce((max, part) => Math.max(max, part.contentIndex), -1)
}

function startSegment(message: Message): Message {
  if (!message.segmentFinalized) return message
  return {
    ...message,
    contentBase: maxContentIndex(message.parts) + 1,
    segmentFinalized: false
  }
}

function upsertPart(
  message: Message,
  contentIndex: number,
  create: () => ChatMessagePart,
  update: (part: ChatMessagePart) => ChatMessagePart
): Message {
  const absoluteIndex = (message.contentBase ?? 0) + contentIndex
  const existing = message.parts.findIndex((part) => part.contentIndex === absoluteIndex)
  const parts = [...message.parts]
  if (existing >= 0) {
    parts[existing] = update(parts[existing]!)
  } else {
    parts.push({ ...create(), contentIndex: absoluteIndex })
    parts.sort((a, b) => a.contentIndex - b.contentIndex)
  }
  return { ...message, parts }
}

function updateToolPart(
  message: Message,
  toolCallId: string,
  create: () => ChatToolPart,
  update: (part: ChatToolPart) => ChatToolPart
): Message {
  const index = message.parts.findIndex(
    (part) => part.type === 'tool' && part.toolCallId === toolCallId
  )
  if (index < 0) {
    return {
      ...message,
      parts: [...message.parts, create()].sort((a, b) => a.contentIndex - b.contentIndex)
    }
  }
  const parts = [...message.parts]
  parts[index] = update(parts[index] as ChatToolPart)
  return { ...message, parts }
}

function authoritativePart(
  part: AiMessageContent,
  contentIndex: number,
  previous?: ChatMessagePart
): ChatMessagePart {
  if (part.type === 'text') return { type: 'text', contentIndex, text: part.text }
  if (part.type === 'thinking') {
    return { type: 'thinking', contentIndex, thinking: part.thinking }
  }
  const previousTool =
    previous?.type === 'tool' && previous.toolCallId === part.id ? previous : undefined
  return {
    type: 'tool',
    contentIndex,
    toolCallId: part.id,
    name: part.name,
    arguments: part.arguments,
    status: previousTool?.status ?? 'running',
    ...(previousTool && 'output' in previousTool ? { output: previousTool.output } : {})
  }
}

function applyCanonicalContentEvent(message: Message, event: AiStreamEvent): Message {
  const current = startSegment(message)
  const base = current.contentBase ?? 0
  const previousById = new Map(
    current.parts
      .filter((part): part is ChatToolPart => part.type === 'tool' && !!part.toolCallId)
      .map((part) => [part.toolCallId!, part])
  )
  const initial = current.parts.flatMap((part): [number, AiMessageContent][] => {
    if (part.contentIndex < base) return []
    const index = part.contentIndex - base
    if (part.type === 'text') return [[index, { type: 'text', text: part.text }]]
    if (part.type === 'thinking') return [[index, { type: 'thinking', thinking: part.thinking }]]
    if (!part.toolCallId || !part.name) return []
    return [
      [
        index,
        {
          type: 'toolCall',
          id: part.toolCallId,
          name: part.name,
          arguments: part.arguments
        }
      ]
    ]
  })
  const canonical = reduceAiStreamState(createAiStreamState(initial), event)
  const parts = [...canonical.contentByIndex.entries()].map(([index, part]) =>
    authoritativePart(
      part,
      base + index,
      part.type === 'toolCall' ? previousById.get(part.id) : undefined
    )
  )
  return {
    ...current,
    parts: [...current.parts.filter((part) => part.contentIndex < base), ...parts].sort(
      (a, b) => a.contentIndex - b.contentIndex
    ),
    ...(event.type === 'message_end' ? { segmentFinalized: true } : {})
  }
}

/**
 * Applies one NDJSON stream event to the in-flight assistant message.
 * Reasoning duration is sealed separately when the stream completes.
 */
export function applyChatStreamEvent(
  messages: Message[],
  event: AiStreamEvent,
  reasoningEndedAt: number | null
): StreamEventResult {
  switch (event.type) {
    case 'text_start':
    case 'text_delta': {
      let nextReasoningEndedAt = reasoningEndedAt
      return {
        messages: updateLastAssistantMessage(messages, (last) => {
          if (event.type === 'text_delta' && last.parts.some((part) => part.type === 'thinking')) {
            nextReasoningEndedAt ??= Date.now()
          }
          return applyCanonicalContentEvent(last, event)
        }),
        reasoningEndedAt: nextReasoningEndedAt
      }
    }
    case 'text_end':
    case 'thinking_start':
    case 'thinking_delta':
    case 'thinking_end':
      return {
        messages: updateLastAssistantMessage(messages, (last) =>
          applyCanonicalContentEvent(last, event)
        ),
        reasoningEndedAt:
          event.type === 'thinking_start' || event.type === 'thinking_delta'
            ? null
            : reasoningEndedAt
      }
    case 'toolcall_start':
      return {
        messages: updateLastAssistantMessage(messages, (last) => {
          const message = startSegment(last)
          return upsertPart(
            message,
            event.contentIndex,
            () => ({
              type: 'tool',
              contentIndex: 0,
              toolCallId: event.toolCallId,
              name: event.toolName,
              status: 'input-streaming'
            }),
            (part) =>
              part.type === 'tool'
                ? {
                    ...part,
                    toolCallId: event.toolCallId,
                    name: event.toolName
                  }
                : {
                    type: 'tool',
                    contentIndex: part.contentIndex,
                    toolCallId: event.toolCallId,
                    name: event.toolName,
                    status: 'input-streaming'
                  }
          )
        }),
        reasoningEndedAt
      }
    case 'toolcall_delta':
      return { messages, reasoningEndedAt }
    case 'toolcall_end':
      return {
        messages: updateLastAssistantMessage(messages, (last) =>
          upsertPart(
            last,
            event.contentIndex,
            () => ({
              type: 'tool',
              contentIndex: 0,
              toolCallId: event.toolCall.id,
              name: event.toolCall.name,
              arguments: event.toolCall.arguments,
              status: 'running'
            }),
            (part) => ({
              type: 'tool',
              contentIndex: part.contentIndex,
              toolCallId: event.toolCall.id,
              name: event.toolCall.name,
              arguments: event.toolCall.arguments,
              status: part.type === 'tool' ? part.status : 'running'
            })
          )
        ),
        reasoningEndedAt
      }
    case 'message_end':
      return {
        messages: updateLastAssistantMessage(messages, (last) =>
          applyCanonicalContentEvent(last, event)
        ),
        reasoningEndedAt
      }
    case 'tool_execution_start':
      return {
        messages: updateLastAssistantMessage(messages, (last) =>
          updateToolPart(
            last,
            event.toolCallId,
            () => ({
              type: 'tool',
              contentIndex: maxContentIndex(last.parts) + 1,
              toolCallId: event.toolCallId,
              name: event.toolName,
              arguments: event.args,
              status: 'running'
            }),
            (part) => ({
              ...part,
              name: event.toolName,
              arguments: event.args,
              status: 'running'
            })
          )
        ),
        reasoningEndedAt
      }
    case 'tool_execution_update':
      return {
        messages: updateLastAssistantMessage(messages, (last) =>
          updateToolPart(
            last,
            event.toolCallId,
            () => ({
              type: 'tool',
              contentIndex: maxContentIndex(last.parts) + 1,
              toolCallId: event.toolCallId,
              name: event.toolName,
              arguments: event.args,
              status: 'running',
              output: event.partialResult
            }),
            (part) => ({
              ...part,
              name: event.toolName,
              arguments: event.args,
              status: 'running',
              output: event.partialResult
            })
          )
        ),
        reasoningEndedAt
      }
    case 'tool_execution_end':
      return {
        messages: updateLastAssistantMessage(messages, (last) =>
          updateToolPart(
            last,
            event.toolCallId,
            () => ({
              type: 'tool',
              contentIndex: maxContentIndex(last.parts) + 1,
              toolCallId: event.toolCallId,
              name: event.toolName,
              status: event.isError ? 'error' : 'success',
              output: event.result
            }),
            (part) => ({
              ...part,
              name: event.toolName,
              status: event.isError ? 'error' : 'success',
              output: event.result
            })
          )
        ),
        reasoningEndedAt
      }
    case 'extension_ui_request':
    case 'attachment_uploads_ready':
      return { messages, reasoningEndedAt }
    case 'stream_end':
    case 'error':
      return { messages, reasoningEndedAt }
  }
}

/** Seals reasoning duration once, at stream end — not on every reasoning/content transition. */
export function sealReasoningDuration(
  messages: Message[],
  reasoningStart: number,
  reasoningEndedAt: number | null,
  alreadySealed: boolean
): Message[] {
  if (alreadySealed) return messages
  const end = reasoningEndedAt ?? Date.now()
  const seconds = Math.round((end - reasoningStart) / 1000)
  return updateLastAssistantMessage(messages, (last) => ({
    ...last,
    reasoningDuration: seconds,
    segmentFinalized: true
  }))
}
