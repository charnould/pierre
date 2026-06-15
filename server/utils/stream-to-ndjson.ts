import type { CopilotChunk } from './copilot-agent'

export type ReasoningDisplay = 'off' | 'partial' | 'full'

/** Canonical NDJSON wire events for `/ai` and `/ai/answer`. */
export type NdjsonStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'reasoning_delta'; content: string }
  | { type: 'reset' }
  | { type: 'done'; content: string }
  | { type: 'error' }

export function ndjsonLine(event: NdjsonStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

type ReasoningFormatState = { needsBullet: boolean }

/**
 * Maps one Copilot chunk to zero or more NDJSON lines (reasoning may be filtered).
 */
export function* copilotChunkToNdjson(
  chunk: CopilotChunk,
  reasoningDisplay: ReasoningDisplay,
  state: ReasoningFormatState
): Generator<NdjsonStreamEvent> {
  if (chunk.type === 'delta') {
    yield { type: 'delta', content: chunk.content }
    return
  }

  if (chunk.type === 'reset') {
    yield { type: 'reset' }
    return
  }

  if (chunk.type === 'done') {
    yield { type: 'done', content: chunk.fullContent }
    return
  }

  if (chunk.type === 'intent') {
    if (reasoningDisplay === 'partial') {
      const trimmed = chunk.content.trim()
      const punctuated = /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.'
      yield { type: 'reasoning_delta', content: ' ' + punctuated + ' ' }
    }
    return
  }

  if (chunk.type === 'reasoning_delta' && reasoningDisplay !== 'off') {
    if (reasoningDisplay === 'partial' && chunk.source === 'reasoning') {
      let content = chunk.content.replace(/[\n\r]+/g, ' ')
      if (content.length > 0 && !/\s$/.test(content)) content += ' '
      yield { type: 'reasoning_delta', content }
      return
    }
    if (reasoningDisplay === 'full' && chunk.source === 'reasoning') {
      const prefix = state.needsBullet ? '\n\n- ' : ''
      state.needsBullet = false
      yield { type: 'reasoning_delta', content: prefix + chunk.content }
      return
    }
    if (reasoningDisplay === 'full' && chunk.source === 'tool_start') {
      if (chunk.content === '\n\n') state.needsBullet = true
      yield { type: 'reasoning_delta', content: chunk.content }
    }
  }
}
