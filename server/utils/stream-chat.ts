import type { AIContext } from './_schema'
import type { PiImageContent, ProcessedPiAttachments } from './ai-attachments'
import { streamCopilot } from './copilot-agent'
import { save_reply } from './handle-conversation'
import { send_telemetry } from './send-telemetry'
import { copilotChunkToNdjson, ndjsonLine } from './stream-to-ndjson'
import { CHAT_TELEMETRY_EVENT } from './telemetry-event'

/**
 * Chat stream: Copilot → canonical NDJSON, then persist the internal final reply.
 */
export function streamChatAnswer(
  context: AIContext,
  signal?: AbortSignal,
  attachments?: PiImageContent[],
  attachmentLifecycle?: Pick<ProcessedPiAttachments, 'claim' | 'rollback' | 'usage'>
) {
  async function* run() {
    let attachmentsReady = false
    let attachmentsReadyEmitted = false
    const claimAttachments = () => {
      if (!attachmentLifecycle) return
      attachmentLifecycle.claim()
      attachmentsReady = true
    }
    const readyEvent = () => {
      if (!attachmentsReady || attachmentsReadyEmitted) return null
      attachmentsReadyEmitted = true
      return ndjsonLine({
        type: 'attachment_uploads_ready',
        ...attachmentLifecycle?.usage
      })
    }

    try {
      console.log(`[CHAT] Streaming for conv=${context.conv_id}...`)

      let fullContent = ''
      let inputTokens: number | null = null
      let outputTokens: number | null = null
      const trace = context.config.trace

      for await (const chunk of streamCopilot(
        context.conv_id,
        context.config.id,
        context.content,
        Bun.env['AI_MODEL'],
        signal,
        attachments,
        context.config.reasoning_effort,
        attachmentLifecycle ? { onVmAcquired: claimAttachments } : undefined
      )) {
        const attachmentEvent = readyEvent()
        if (attachmentEvent) yield attachmentEvent
        if (chunk.type === 'done') {
          fullContent = chunk.fullContent
          inputTokens = chunk.inputTokens ?? null
          outputTokens = chunk.outputTokens ?? null
        }

        for (const event of copilotChunkToNdjson(chunk, trace)) {
          yield ndjsonLine(event)
        }
      }

      claimAttachments()
      const attachmentEvent = readyEvent()
      if (attachmentEvent) yield attachmentEvent
      console.log(`[CHAT] Stream complete (${fullContent.length} chars)`)

      context.role = 'assistant'
      context.content = fullContent
      context.metadata.tokens = {
        completion: outputTokens,
        prompt: inputTokens,
        total: inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null
      }
      await save_reply(context)
      send_telemetry(CHAT_TELEMETRY_EVENT)
    } catch (err) {
      const attachmentEvent = readyEvent()
      if (attachmentEvent) yield attachmentEvent
      await attachmentLifecycle?.rollback()
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
