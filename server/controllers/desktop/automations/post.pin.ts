import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { AutomationsError, set_automation_pin } from '../../../utils/automations/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  try {
    return c.json({ data: set_automation_pin(id, user.email, user.email, true) })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[post.desktop.automations.pin]', error)
    return c.json({ error: { code: 'internal_error', message: 'Failed to pin automation' } }, 500)
  }
}
