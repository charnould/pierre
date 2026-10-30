import { AIContext } from '../../utils/_schema'
import {
  assertAttachmentLimits,
  assertCanonicalConversationId,
  assertMultipartRequestSize,
  AttachmentRequestError,
  bindAttachmentReservation,
  type ProcessedPiAttachments,
  processUploadedAttachments
} from '../../utils/ai-attachments'
import type { AppContext } from '../../utils/authenticate-user'
import { ChatConfigAccessError, resolveAuthorizedChatConfig } from '../../utils/chat-config-access'
import { loadChatbotConfig } from '../../utils/chatbot-config'
import { beginPublicChat, publicChatAddress } from '../../utils/public-chat-limit'
import { getWorkspacesPath } from '../../utils/smolvm'
import { streamChatRequest, streamChatRequestError } from '../../utils/stream-chat-request'
import { tryReserveConversation } from '../../utils/vm-registry'

type PostAiDependencies = {
  processAttachments: typeof processUploadedAttachments
  workspacesPath: typeof getWorkspacesPath
  parseContext: (value: unknown) => Promise<AIContext>
  loadConfig: (configName: string) => Promise<unknown>
  streamRequest: typeof streamChatRequest
  streamError: typeof streamChatRequestError
}

const defaultDependencies: PostAiDependencies = {
  processAttachments: processUploadedAttachments,
  workspacesPath: getWorkspacesPath,
  parseContext: (value) => AIContext.parseAsync(value),
  loadConfig: loadChatbotConfig,
  streamRequest: streamChatRequest,
  streamError: streamChatRequestError
}

/**
 * POST /chat — chat stream with optional multipart file attachments.
 */
export const createPostAiController =
  (dependencies: Partial<PostAiDependencies> = {}) =>
  async (c: AppContext) => {
    const deps = { ...defaultDependencies, ...dependencies }
    let processed: ProcessedPiAttachments | undefined
    let releaseReservation: (() => void) | undefined
    let releasePublicChat: (() => void) | undefined
    try {
      assertMultipartRequestSize(c.req.header('content-length'))
      const user = c.get('user')
      if (!user) {
        const gate = beginPublicChat(publicChatAddress(c.req.raw))
        if (!gate.ok) {
          return c.json({ error: { code: 'rate_limited', message: 'Trop de demandes.' } }, 429, {
            'retry-after': String(gate.retryAfter)
          })
        }
        releasePublicChat = gate.release
      }
      const formData = await c.req.formData()
      if (formData.get('conv_id') != null || formData.get('config') != null) {
        releasePublicChat?.()
        return c.json({ error: { code: 'invalid_body', message: 'Unknown field' } }, 400)
      }
      const configName = (formData.get('configId') as string | null) ?? ''
      const message = (formData.get('message') as string | null) ?? ''
      const requestedConvId = (formData.get('conversationId') as string | null)?.trim()
      const conv_id = requestedConvId
        ? assertCanonicalConversationId(requestedConvId)
        : Bun.randomUUIDv7()
      const dataRaw = formData.get('data') as string | null
      const customRaw =
        dataRaw === null || dataRaw === undefined || dataRaw === 'undefined'
          ? ['']
          : dataRaw.split('|')

      const config = await resolveAuthorizedChatConfig(configName, user, deps.loadConfig)
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
      const workspacesRoot = deps.workspacesPath(config.id)
      assertAttachmentLimits(rawFiles)
      releaseReservation = tryReserveConversation(conv_id) ?? undefined
      if (!releaseReservation) {
        releasePublicChat?.()
        return c.json({ error: { code: 'capacity_reached', message: 'Serveur occupé.' } }, 429, {
          'retry-after': '1'
        })
      }
      processed = bindAttachmentReservation(
        await deps.processAttachments(rawFiles, workspacesRoot, message, conv_id),
        releaseReservation
      )
      const { images, content } = processed

      const context = await deps.parseContext({
        config,
        custom_data: { raw: customRaw },
        user_email: user?.email ?? null,
        content,
        conv_id,
        role: 'user'
      })

      const response = await deps.streamRequest(
        c,
        context,
        images,
        processed,
        undefined,
        releasePublicChat
      )
      releasePublicChat = undefined
      return response
    } catch (e) {
      releasePublicChat?.()
      await processed?.rollback()
      releaseReservation?.()
      if (e instanceof AttachmentRequestError || e instanceof ChatConfigAccessError) {
        return c.json({ error: { code: e.code, message: e.message } }, e.status)
      }
      return deps.streamError(c, e)
    }
  }

export const postChat = createPostAiController()
