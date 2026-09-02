import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import { ActivitiesError } from '../../../utils/activities/schema'
import { delete_activity } from '../../../utils/activities/write'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const id = z.coerce.number().int().positive().safeParse(c.req.param('id'))
  if (!id.success) {
    return c.json({ error: { code: 'invalid_body', message: 'Activity id required' } }, 400)
  }
  try {
    delete_activity(user.email, id.data)
    return c.json({ data: { deleted: true } })
  } catch (error) {
    if (error instanceof ActivitiesError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    throw error
  }
}
