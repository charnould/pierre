import type { AiStreamEvent } from '../../shared/ai-stream-events'
import type { TraceMode } from '../../shared/chat'
import { showsThinking, showsTools } from '../../shared/chat'
import type { CopilotChunk } from './copilot-agent'

/** Canonical NDJSON wire events for `/ai` and `/ai/answer`. */
export type NdjsonStreamEvent = AiStreamEvent

const THINKING_EVENTS = new Set(['thinking_start', 'thinking_delta', 'thinking_end'])
const TOOL_EVENTS = new Set([
  'toolcall_start',
  'toolcall_delta',
  'toolcall_end',
  'tool_execution_start',
  'tool_execution_update',
  'tool_execution_end'
])

export function ndjsonLine(event: NdjsonStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

function isThinkingEvent(type: string): boolean {
  return THINKING_EVENTS.has(type)
}

function isToolEvent(type: string): boolean {
  return TOOL_EVENTS.has(type)
}

/**
 * Maps one Copilot chunk to zero or more NDJSON lines (trace may be filtered).
 */
export function* copilotChunkToNdjson(
  chunk: CopilotChunk,
  trace: TraceMode
): Generator<NdjsonStreamEvent> {
  if (chunk.type === 'done') {
    yield { type: 'stream_end' }
    return
  }

  if (!showsThinking(trace) && isThinkingEvent(chunk.type)) return
  if (!showsTools(trace) && isToolEvent(chunk.type)) return

  if (chunk.type === 'message_end') {
    yield {
      ...chunk,
      message: {
        ...chunk.message,
        content: chunk.message.content.filter((part) => {
          if (part.type === 'thinking') return showsThinking(trace)
          if (part.type === 'toolCall') return showsTools(trace)
          return true
        })
      }
    }
    return
  }

  yield chunk
}
