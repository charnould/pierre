import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { login_from_email } from '../../../utils/activities/rows'
import {
  BulkOperationsError,
  CreateBulkOperationBodySchema,
  create_bulk_operation
} from '../../../utils/bulk/store'

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
  const parsed = CreateBulkOperationBodySchema.safeParse(body)
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
    return c.json({ data: create_bulk_operation(login_from_email(user.email), parsed.data) }, 201)
  } catch (error) {
    if (error instanceof BulkOperationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    console.error('[post.desktop.bulk-operations]', error)
    return c.json({ error: { code: 'internal_error', message: 'Création impossible' } }, 500)
  }
}
