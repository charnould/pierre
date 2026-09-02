import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import { ActivitiesError, CreateActivityInput } from '../../../utils/activities/schema'
import { create_activity } from '../../../utils/activities/write'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = CreateActivityInput.safeParse(body)
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
    return c.json({
      data: create_activity(user.email, parsed.data)
    })
  } catch (error) {
    if (error instanceof ActivitiesError || error instanceof z.ZodError) {
      const forbidden = error instanceof ActivitiesError && error.code === 'forbidden'
      const conflict = error instanceof ActivitiesError && error.code === 'conflict'
      const status = forbidden ? 403 : conflict ? 409 : 400
      return c.json(
        {
          error: {
            code: forbidden ? 'forbidden' : conflict ? 'conflict' : 'invalid_body',
            message: error.message
          }
        },
        status
      )
    }
    throw error
  }
}
