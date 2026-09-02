import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import { ActivitiesError, ActivityPatchInput } from '../../../utils/activities/schema'
import { patch_activity } from '../../../utils/activities/write'

const error_response = (c: Context, error: ActivitiesError) => {
  const status =
    error.code === 'not_found'
      ? 404
      : error.code === 'forbidden'
        ? 403
        : error.code === 'conflict'
          ? 409
          : 400
  return c.json({ error: { code: error.code, message: error.message } }, status)
}

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const id = z.coerce.number().int().positive().safeParse(c.req.param('id'))
  if (!id.success) {
    return c.json({ error: { code: 'invalid_body', message: 'Activity id required' } }, 400)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = ActivityPatchInput.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_body',
          message: parsed.error.issues.map((issue) => issue.message).join('; ')
        }
      },
      400
    )
  }
  try {
    const data = patch_activity(user.email, id.data, parsed.data)
    return c.json({ data })
  } catch (error) {
    if (error instanceof ActivitiesError) return error_response(c, error)
    throw error
  }
}
