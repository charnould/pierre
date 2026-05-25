import type { AIContext } from './_schema'
import { streamCopilot } from './copilot-agent'
import { save_reply } from './handle-conversation'
import { send_telemetry } from './send-telemetry'
import { copilotChunkToNdjson, ndjsonLine, type ReasoningDisplay } from './stream-to-ndjson'

/**
 * Chat stream: Copilot → canonical NDJSON, then persist assistant reply on `done`.
 */
export function streamChatAnswer(context: AIContext, signal?: AbortSignal) {
  async function* run() {
    try {
      console.log(`[CHAT] Streaming for conv=${context.conv_id}...`)

      let fullContent = ''
      let inputTokens: number | null = null
      let outputTokens: number | null = null
      const formatState = { needsBullet: true }
      const reasoningDisplay: ReasoningDisplay = context.config.reasoning_display ?? 'off'

      for await (const chunk of streamCopilot(
        context.conv_id,
        context.config.id,
        context.content,
        Bun.env['AI_MODEL'],
        signal,
        undefined,
        context.config.reasoning_effort
      )) {
        if (chunk.type === 'done') {
          fullContent = chunk.fullContent
          inputTokens = chunk.inputTokens ?? null
          outputTokens = chunk.outputTokens ?? null
        }

        for (const event of copilotChunkToNdjson(chunk, reasoningDisplay, formatState)) {
          yield ndjsonLine(event)
        }
      }

      console.log(`[CHAT] Stream complete (${fullContent.length} chars)`)

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
        console.log('[CHAT] Request aborted by client')
        return
      }
      console.error('[CHAT] Error:', err)
      yield ndjsonLine({ type: 'error' })
    }
  }

  return { textStream: run() }
}
