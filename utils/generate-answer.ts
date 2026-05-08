import type { AIContext } from './_schema'
import { streamCopilot } from './copilot-agent'
import { save_reply } from './handle-conversation'
import { send_telemetry } from './send-telemetry'

/**
 * Generate an AI answer using GitHub Copilot SDK with real-time streaming.
 *
 * 1. Streams delta chunks from the Copilot agent to the frontend as NDJSON
 * 2. Sends a final authoritative `done` event with the complete content
 * 3. Persists the assistant reply to telemetry after streaming completes
 *
 * NDJSON events emitted:
 *   - {t:"response", d:{content:"chunk"}}  — incremental delta
 *   - {t:"done",     d:{content:"full"}}   — authoritative final answer
 *   - {t:"error",    d:{}}                 — error
 */
export const answer_user = (context: AIContext, signal?: AbortSignal) => {
  async function* streamToFrontend() {
    try {
      console.log(`[ANSWER] Streaming from Copilot for conv=${context.conv_id}...`)

      let fullContent = ''
      let inputTokens: number | null = null
      let outputTokens: number | null = null
      // In full mode, track whether the next reasoning chunk needs a bullet prefix
      let needsBullet = true

      for await (const chunk of streamCopilot(
        context.conv_id,
        context.config.id,
        context.content,
        Bun.env['AI_MODEL'],
        signal,
        undefined,
        context.config.reasoning_effort
      )) {
        if (chunk.type === 'delta') {
          yield JSON.stringify({ t: 'response', d: { content: chunk.content } }) + '\n'
        } else if (chunk.type === 'intent') {
          // assistant.intent: short description of what the agent is doing
          // shown only in partial mode (in full mode, reasoning text already covers it)
          if (context.config.reasoning_display === 'partial') {
            // Wrap with spaces and add a period if not already punctuated
            const trimmed = chunk.content.trim()
            const punctuated = /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.'
            const content = ' ' + punctuated + ' '
            yield JSON.stringify({ t: 'thinking', d: { content } }) + '\n'
          }
        } else if (chunk.type === 'reasoning_delta') {
          const mode = context.config.reasoning_display
          if (mode === 'partial' && chunk.source === 'reasoning') {
            // Partial: reasoning tokens only.
            // Normalize newlines to spaces, then ensure a trailing space so adjacent
            // chunks don't collide (e.g. "…info." + "Searching" → "…info. Searching")
            let content = chunk.content.replace(/[\n\r]+/g, ' ')
            if (content.length > 0 && !/\s$/.test(content)) content += ' '
            yield JSON.stringify({ t: 'thinking', d: { content } }) + '\n'
          } else if (mode === 'full' && chunk.source === 'reasoning') {
            // Prepend bullet on first reasoning chunk and after each tool completion
            const prefix = needsBullet ? '\n\n- ' : ''
            needsBullet = false
            yield JSON.stringify({ t: 'thinking', d: { content: prefix + chunk.content } }) + '\n'
          } else if (mode === 'full' && chunk.source === 'tool_start') {
            // tool_start already contains \n\n- prefix for tool lines, or \n\n for completion
            // After a tool completes (\n\n), the next reasoning chunk needs a bullet
            if (chunk.content === '\n\n') needsBullet = true
            yield JSON.stringify({ t: 'thinking', d: { content: chunk.content } }) + '\n'
          }
        } else if (chunk.type === 'reset') {
          yield JSON.stringify({ t: 'reset' }) + '\n'
        } else if (chunk.type === 'done') {
          fullContent = chunk.fullContent
          inputTokens = chunk.inputTokens ?? null
          outputTokens = chunk.outputTokens ?? null

          // Send authoritative final content so the frontend can reconcile
          yield JSON.stringify({ t: 'done', d: { content: fullContent } }) + '\n'
        }
      }

      console.log(`[ANSWER] Stream complete (${fullContent.length} chars)`)

      // Persist after streaming
      context.role = 'assistant'
      context.content = fullContent
      context.metadata.tokens = {
        completion: outputTokens,
        prompt: inputTokens,
        total: inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null
      }
      await save_reply(context)
      send_telemetry('ai.chat')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[ANSWER] Request aborted by client')
        return
      }
      console.error('[ANSWER] Error:', err)
      yield JSON.stringify({ t: 'error', d: {} }) + '\n'
    }
  }

  return { textStream: streamToFrontend() }
}
