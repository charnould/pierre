import type { Context } from 'hono'

import { destroyVm } from '../../utils/vm-registry'

/**
 * POST /ai/vm/release
 *
 * JSON or form body: conv_id — destroys the VM for that conversation immediately.
 * Idempotent when no VM is registered for the given conv_id.
 */
export const controller = async (c: Context) => {
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

  await destroyVm(conv_id.trim())
  return c.body(null, 204)
}
