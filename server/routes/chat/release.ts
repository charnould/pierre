import { assertCanonicalConversationId, AttachmentRequestError } from '../../utils/ai-attachments'
import type { AuthContext } from '../../utils/authenticate-user'
import { destroyVm } from '../../utils/vm-registry'

export const createReleaseChatSession =
  (destroy: typeof destroyVm = destroyVm) =>
  async (c: AuthContext) => {
    const conversationId = c.req.param('conversationId')?.trim() ?? ''
    if (!conversationId) {
      return c.json({ error: { code: 'invalid_body', message: 'conversationId required' } }, 400)
    }

    let canonicalConversationId: string
    try {
      canonicalConversationId = assertCanonicalConversationId(conversationId)
    } catch (error) {
      if (error instanceof AttachmentRequestError) {
        return c.json({ error: { code: error.code, message: error.message } }, error.status)
      }
      throw error
    }

    await destroy(canonicalConversationId)
    return c.body(null, 204)
  }

export const releaseChatSession = createReleaseChatSession()
