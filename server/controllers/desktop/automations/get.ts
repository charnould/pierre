import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { AutomationsError, list_automations } from '../../../utils/automations/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  try {
    return c.json({ data: list_automations(user.email, user.email) })
  } catch (error) {
    console.error('[get.desktop.automations]', error)
    if (error instanceof AutomationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    return c.json({ error: { code: 'internal_error', message: 'Failed to list automations' } }, 500)
  }
}
