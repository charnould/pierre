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

      for await (const chunk of streamCopilot(
        context.conv_id,
        context.config.id,
        context.content,
        Bun.env['AI_MODEL'],
        signal
      )) {
        if (chunk.type === 'delta') {
          yield JSON.stringify({ t: 'response', d: { content: chunk.content } }) + '\n'
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
