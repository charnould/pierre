import type { AIContext } from './_schema'

/** Prefix `custom_data.format()` onto the model prompt, not the user bubble. */
export function modelPrompt(context: AIContext): string {
  const prefix = context.custom_data.transformed.trim()
  return prefix === '' ? context.content : `${prefix}\n\n${context.content}`
}
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
  attachmentLifecycle?: Pick<ProcessedPiAttachments, 'claim' | 'rollback' | 'usage'>,
  dependencies: {
    streamCopilot?: typeof streamCopilot
    saveReply?: typeof save_reply
    sendTelemetry?: typeof send_telemetry
  } = {}
) {
  const stream = dependencies.streamCopilot ?? streamCopilot
  const saveReply = dependencies.saveReply ?? save_reply
  const telemetry = dependencies.sendTelemetry ?? send_telemetry
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
      const trace = context.config.trace

      for await (const chunk of stream(
        context.conv_id,
        context.config.id,
        modelPrompt(context),
        undefined,
        signal,
        attachments,
        undefined,
        {
          usage: { operation: 'chat', userEmail: context.user_email },
          ...(attachmentLifecycle ? { onVmAcquired: claimAttachments } : {})
        }
      )) {
        const attachmentEvent = readyEvent()
        if (attachmentEvent) yield attachmentEvent
        if (chunk.type === 'done') fullContent = chunk.fullContent

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
      await saveReply(context)
      telemetry(CHAT_TELEMETRY_EVENT)
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
