import type { Context } from 'hono'

import { assertCanonicalConversationId, AttachmentRequestError } from '../../utils/ai-attachments'
import { destroyVm } from '../../utils/vm-registry'

/**
 * POST /ai/vm/release
 *
 * JSON or form body: conv_id — destroys the VM for that conversation immediately.
 * Idempotent when no VM is registered for the given conv_id.
 */
export const createPostVmReleaseController =
  (destroy: typeof destroyVm = destroyVm) =>
  async (c: Context) => {
    let conv_id: string | null = null

    const contentType = c.req.header('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await c.req.json().catch(() => null)) as { conv_id?: string } | null
      conv_id = body?.conv_id ?? null
    } else {
      const formData = await c.req.formData().catch(() => null)
      conv_id = (formData?.get('conv_id') as string | null) ?? null
    }

    if (!conv_id?.trim()) {
      return c.json({ error: 'conv_id required' }, 400)
    }

    let canonicalConvId: string
    try {
      canonicalConvId = assertCanonicalConversationId(conv_id.trim())
    } catch (error) {
      if (error instanceof AttachmentRequestError) {
        return c.json({ error: { code: error.code, message: error.message } }, error.status)
      }
      throw error
    }

    await destroy(canonicalConvId)
    return c.body(null, 204)
  }

export const controller = createPostVmReleaseController()
