import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { CreateAutomationBodySchema } from '../../../utils/automations/schemas'
import { AutomationsError, create_automation } from '../../../utils/automations/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = CreateAutomationBodySchema.safeParse(body)
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
    return c.json({ data: await create_automation(user.email, parsed.data) }, 201)
  } catch (error) {
    console.error('[post.desktop.automations]', error)
    if (error instanceof AutomationsError) {
      const status = error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    return c.json(
      { error: { code: 'internal_error', message: 'Failed to create automation' } },
      500
    )
  }
}
