import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { run_automation_now } from '../../../utils/automations/run'
import { AutomationsError } from '../../../utils/automations/store'

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
    const data = await run_automation_now(id, user.email)
    return c.json({ data })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status =
        error.code === 'not_found'
          ? 404
          : error.code === 'forbidden'
            ? 403
            : error.code === 'conflict'
              ? 409
              : error.code === 'unavailable'
                ? 503
                : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[post.desktop.automations.run]', error)
    return c.json({ error: { code: 'internal_error', message: 'Failed to run automation' } }, 500)
  }
}
