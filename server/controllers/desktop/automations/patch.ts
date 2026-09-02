import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { PatchAutomationBodySchema } from '../../../utils/automations/schemas'
import { AutomationsError, update_automation } from '../../../utils/automations/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = PatchAutomationBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join('; ')
        }
      },
      400
    )
  }
  try {
    return c.json({ data: await update_automation(id, user.email, parsed.data) })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[patch.desktop.automations]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Failed to update automation' } },
      500
    )
  }
}
