import { stream } from 'hono/streaming'

import { businessModuleForSkillId } from '../../../shared/modules'
import {
  assertAttachmentLimits,
  assertCanonicalConversationId,
  assertMultipartRequestSize,
  AttachmentRequestError,
  bindAttachmentReservation,
  type ProcessedPiAttachments,
  processUploadedAttachments
} from '../../utils/ai-attachments'
import type { AuthContext } from '../../utils/authenticate-user'
import { userCanAccessModule } from '../../utils/authorize-role'
import { streamCopilot } from '../../utils/copilot-agent'
import { send_telemetry } from '../../utils/send-telemetry'
import { loadConfiguredSkill, SkillRequestError } from '../../utils/skill-config'
import { getWorkspacesPath } from '../../utils/smolvm'
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
 * POST /workflows
 *
 * Multipart: conv_id, id_skill, payload (JSON), files (optional).
 * Streams the canonical structured NDJSON contract.
 *
 * Telemetry: on successful stream, emits `ai.answer.<id_skill>` (see MEMORY.md).
 */
export const createPostAnswerController =
  (dependencies: Partial<PostAnswerDependencies> = {}) =>
  async (c: AuthContext) => {
    const deps = { ...defaultDependencies, ...dependencies }
    let processed: ProcessedPiAttachments | undefined
    let releaseReservation: (() => void) | undefined
    try {
      assertMultipartRequestSize(c.req.header('content-length'))
      const formData = await c.req.formData()
      if (formData.get('conv_id') != null || formData.get('id_skill') != null) {
        return c.json({ error: { code: 'invalid_body', message: 'Unknown field' } }, 400)
      }
      const requestedConvId = (formData.get('conversationId') as string | null)?.trim()
      const conv_id = requestedConvId
        ? assertCanonicalConversationId(requestedConvId)
        : Bun.randomUUIDv7()
      const skillPart = formData.get('skillId')
      const skillConfig = await loadConfiguredSkill(typeof skillPart === 'string' ? skillPart : '')
      const skill = skillConfig.id
      const user = c.get('user')
      if (!userCanAccessModule(user, businessModuleForSkillId(skill))) {
        return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
      }
      const payloadRaw = (formData.get('payload') as string | null) ?? ''

      const workflowPayload = parseWorkflowPayload(payloadRaw)
      if (!workflowPayload) {
        return c.json(
          { error: { code: 'invalid_payload', message: 'Workflow payload is invalid' } },
          400
        )
      }

      const trace = skillConfig.trace

      const workspacesRoot = getWorkspacesPath(skill)
      const fileParts = formData.getAll('files')
      if (!fileParts.every((part): part is File => part instanceof File)) {
        throw new AttachmentRequestError('invalid_multipart', 'Invalid multipart file field')
      }
      const rawFiles = fileParts
      assertAttachmentLimits(rawFiles)
      releaseReservation = reserveConversation(conv_id)
      processed = bindAttachmentReservation(
        await processUploadedAttachments(rawFiles, workspacesRoot, WORKFLOW_USER_PROMPT, conv_id),
        releaseReservation
      )
      const attachmentLifecycle = processed
      const { images, content: prompt } = attachmentLifecycle

      c.header('Content-Type', 'application/x-ndjson; charset=utf-8')

      return stream(
        c,
        async (s) => {
          const ac = new AbortController()
          let attachmentsReady = false
          let attachmentsReadyEmitted = false
          const claimAttachments = () => {
            attachmentLifecycle.claim()
            attachmentsReady = true
          }
          const emitAttachmentsReady = async () => {
            if (!attachmentsReady || attachmentsReadyEmitted) return
            attachmentsReadyEmitted = true
            await s.write(
              ndjsonLine({
                type: 'attachment_uploads_ready',
                ...attachmentLifecycle.usage
              })
            )
          }
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
              undefined,
              {
                workflowPayload,
                onVmAcquired: claimAttachments,
                usage: { operation: 'workflow', userEmail: user.email }
              }
            )) {
              await emitAttachmentsReady()
              for (const event of copilotChunkToNdjson(chunk, trace)) {
                await s.write(ndjsonLine(event))
              }
            }

            claimAttachments()
            await emitAttachmentsReady()
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

export const generateWorkflow = createPostAnswerController()
