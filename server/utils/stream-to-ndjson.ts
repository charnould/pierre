import type { AiStreamEvent } from '../../shared/ai-stream-events'
import type { CopilotChunk } from './copilot-agent'

export type ReasoningDisplay = 'off' | 'partial' | 'full'

/** Canonical NDJSON wire events for `/ai` and `/ai/answer`. */
export type NdjsonStreamEvent = AiStreamEvent

export function ndjsonLine(event: NdjsonStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

/**
 * Maps one Copilot chunk to zero or more NDJSON lines (reasoning may be filtered).
 */
export function* copilotChunkToNdjson(
  chunk: CopilotChunk,
  reasoningDisplay: ReasoningDisplay
): Generator<NdjsonStreamEvent> {
  if (chunk.type === 'done') {
    yield { type: 'stream_end' }
    return
  }

  if (
    reasoningDisplay === 'off' &&
    (chunk.type === 'thinking_start' ||
      chunk.type === 'thinking_delta' ||
      chunk.type === 'thinking_end')
  ) {
    return
  }

  if (chunk.type === 'message_end' && reasoningDisplay === 'off') {
    yield {
      ...chunk,
      message: {
        ...chunk.message,
        content: chunk.message.content.filter((part) => part.type !== 'thinking')
      }
    }
    return
  }

  yield chunk
}
