import type { Context } from 'hono'

import { AIContext, type Parsed_User } from '../../utils/_schema'
import {
  assertAttachmentLimits,
  assertCanonicalConversationId,
  assertMultipartRequestSize,
  AttachmentRequestError,
  bindAttachmentReservation,
  processUploadedAttachments,
  type ProcessedPiAttachments
} from '../../utils/ai-attachments'
import { ChatConfigAccessError, resolveAuthorizedChatConfig } from '../../utils/chat-config-access'
import { loadChatbotConfig } from '../../utils/chatbot-config'
import { getUploadsPath } from '../../utils/smolvm'
import { streamChatRequest, streamChatRequestError } from '../../utils/stream-chat-request'
import { reserveConversation } from '../../utils/vm-registry'

type PostAiDependencies = {
  processAttachments: typeof processUploadedAttachments
  uploadsPath: typeof getUploadsPath
  parseContext: (value: unknown) => Promise<AIContext>
  loadConfig: (configName: string) => Promise<unknown>
  streamRequest: typeof streamChatRequest
  streamError: typeof streamChatRequestError
}

const defaultDependencies: PostAiDependencies = {
  processAttachments: processUploadedAttachments,
  uploadsPath: getUploadsPath,
  parseContext: (value) => AIContext.parseAsync(value),
  loadConfig: loadChatbotConfig,
  streamRequest: streamChatRequest,
  streamError: streamChatRequestError
}

/**
 * POST /ai — chat stream with optional multipart file attachments.
 */
export const createPostAiController =
  (dependencies: Partial<PostAiDependencies> = {}) =>
  async (c: Context) => {
    const deps = { ...defaultDependencies, ...dependencies }
    let processed: ProcessedPiAttachments | undefined
    let releaseReservation: (() => void) | undefined
    try {
      assertMultipartRequestSize(c.req.header('content-length'))
      const formData = await c.req.formData()
      const configName = (formData.get('config') as string | null) ?? ''
      const message = (formData.get('message') as string | null) ?? ''
      const requestedConvId = (formData.get('conv_id') as string | null)?.trim()
      const conv_id = requestedConvId
        ? assertCanonicalConversationId(requestedConvId)
        : Bun.randomUUIDv7()
      const dataRaw = formData.get('data') as string | null
      const customRaw =
        dataRaw === null || dataRaw === undefined || dataRaw === 'undefined'
          ? ['']
          : dataRaw.split('|')

      const config = await resolveAuthorizedChatConfig(
        configName,
        c.get('user') as Parsed_User | null | undefined,
        deps.loadConfig
      )
      const fileParts = formData.getAll('files')
      if (!fileParts.every((part): part is File => part instanceof File)) {
        throw new AttachmentRequestError('invalid_multipart', 'Invalid multipart file field')
      }
      const rawFiles = fileParts
      if (rawFiles.length > 0 && config.attachments === false) {
        throw new AttachmentRequestError(
          'attachments_disabled',
          'Attachments are disabled for this chatbot',
          403
        )
      }
      const uploadRoot = deps.uploadsPath(config.id)
      assertAttachmentLimits(rawFiles)
      releaseReservation = reserveConversation(conv_id)
      processed = bindAttachmentReservation(
        await deps.processAttachments(rawFiles, uploadRoot, message, conv_id),
        releaseReservation
      )
      const { images, content } = processed

      const context = await deps.parseContext({
        config,
        custom_data: { raw: customRaw },
        metadata: { user: c.get('user')?.email ?? null },
        content,
        conv_id,
        role: 'user'
      })

      return deps.streamRequest(c, context, images, processed)
    } catch (e) {
      await processed?.rollback()
      releaseReservation?.()
      if (e instanceof AttachmentRequestError || e instanceof ChatConfigAccessError) {
        return c.json({ error: { code: e.code, message: e.message } }, e.status)
      }
      return deps.streamError(c, e)
    }
  }

export const controller = createPostAiController()
