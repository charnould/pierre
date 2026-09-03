import type { Context } from 'hono'
import { stream } from 'hono/streaming'

import {
  assertAttachmentLimits,
  assertCanonicalConversationId,
  assertMultipartRequestSize,
  AttachmentRequestError,
  bindAttachmentReservation,
  processUploadedAttachments,
  type ProcessedPiAttachments
} from '../../utils/ai-attachments'
import { streamCopilot } from '../../utils/copilot-agent'
import { send_telemetry } from '../../utils/send-telemetry'
import { loadConfiguredSkill, SkillRequestError } from '../../utils/skill-config'
import { getUploadsPath } from '../../utils/smolvm'
import { copilotChunkToNdjson, ndjsonLine } from '../../utils/stream-to-ndjson'
import { buildWorkflowTelemetryEvent } from '../../utils/telemetry-event'
import { reserveConversation } from '../../utils/vm-registry'
import { parseWorkflowPayload, WORKFLOW_USER_PROMPT } from '../../utils/workflow-payload'

type PostAnswerDependencies = {
  stream: typeof streamCopilot
  telemetry: typeof send_telemetry
}

const defaultDependencies: PostAnswerDependencies = {
  stream: streamCopilot,
  telemetry: send_telemetry
}

/**
 * POST /ai/answer
 *
 * Multipart: conv_id, id_skill, payload (JSON), files (optional).
 * Streams the canonical structured NDJSON contract.
 *
 * Telemetry: on successful stream, emits `ai.answer.<id_skill>` (see MEMORY.md).
 */
export const createPostAnswerController =
  (dependencies: Partial<PostAnswerDependencies> = {}) =>
  async (c: Context) => {
    const deps = { ...defaultDependencies, ...dependencies }
    let processed: ProcessedPiAttachments | undefined
    let releaseReservation: (() => void) | undefined
    try {
      assertMultipartRequestSize(c.req.header('content-length'))
      const formData = await c.req.formData()
      const requestedConvId = (formData.get('conv_id') as string | null)?.trim()
      const conv_id = requestedConvId
        ? assertCanonicalConversationId(requestedConvId)
        : Bun.randomUUIDv7()
      const skillPart = formData.get('id_skill')
      const skillConfig = await loadConfiguredSkill(typeof skillPart === 'string' ? skillPart : '')
      const skill = skillConfig.id
      const payloadRaw = (formData.get('payload') as string | null) ?? ''

      const workflowPayload = parseWorkflowPayload(payloadRaw)
      if (!workflowPayload) {
        return c.json(
          { error: { code: 'invalid_payload', message: 'Workflow payload is invalid' } },
          400
        )
      }

      const reasoningDisplay = skillConfig.reasoning_display

      const uploadRoot = getUploadsPath(skill)
      const fileParts = formData.getAll('files')
      if (!fileParts.every((part): part is File => part instanceof File)) {
        throw new AttachmentRequestError('invalid_multipart', 'Invalid multipart file field')
      }
      const rawFiles = fileParts
      assertAttachmentLimits(rawFiles)
      releaseReservation = reserveConversation(conv_id)
      processed = bindAttachmentReservation(
        await processUploadedAttachments(rawFiles, uploadRoot, WORKFLOW_USER_PROMPT, conv_id),
        releaseReservation
      )
      const attachmentLifecycle = processed
      const { images, content: prompt } = attachmentLifecycle

      c.header('Content-Type', 'application/x-ndjson; charset=utf-8')

      return stream(
        c,
        async (s) => {
          const ac = new AbortController()
          s.onAbort(() => {
            ac.abort()
          })

          try {
            for await (const chunk of deps.stream(
              conv_id,
              skill,
              prompt,
              undefined,
              ac.signal,
              images,
              'medium',
              { workflowPayload, onVmAcquired: attachmentLifecycle.claim }
            )) {
              for (const event of copilotChunkToNdjson(chunk, reasoningDisplay)) {
                await s.write(ndjsonLine(event))
              }
            }

            attachmentLifecycle.claim()
            deps.telemetry(buildWorkflowTelemetryEvent(skill))
          } catch (e) {
            await attachmentLifecycle.rollback()
            console.error('[post.ai.answer] Stream error:', e)
            await s.write(ndjsonLine({ type: 'error' }))
          }
        },
        async (e, s) => {
          await attachmentLifecycle.rollback()
          console.error('[post.ai.answer] Stream error:', e)
          await s.write(ndjsonLine({ type: 'error' }))
        }
      )
    } catch (e) {
      await processed?.rollback()
      releaseReservation?.()
      if (e instanceof AttachmentRequestError) {
        return c.json({ error: { code: e.code, message: e.message } }, e.status)
      }
      if (e instanceof SkillRequestError) {
        return c.json({ error: { code: e.code, message: e.message } }, e.status)
      }
      console.error('[post.ai.answer] Error:', e)
      return c.json({ error: { code: 'generation_failed', message: 'Generation failed' } }, 500)
    }
  }

export const controller = createPostAnswerController()
