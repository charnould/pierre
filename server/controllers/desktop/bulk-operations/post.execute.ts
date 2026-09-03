import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import { BulkExecutionError, execute_bulk_operation } from '../../../utils/bulk/send'
import { get_bulk_operation } from '../../../utils/bulk/store'

const ExecuteBodySchema = z
  .object({
    mode: z.enum(['send', 'apply_without_send']),
    clientCommandId: z.string().trim().min(1)
  })
  .strict()

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const bulkOperation = get_bulk_operation(c.req.param('id')!)
  if (!bulkOperation) {
    return c.json({ error: { code: 'not_found', message: 'Bulk operation not found' } }, 404)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = ExecuteBodySchema.safeParse(body)
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
      data: await execute_bulk_operation(user.email, bulkOperation, parsed.data)
    })
  } catch (error) {
    if (error instanceof BulkExecutionError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    console.error('[post.desktop.bulk-operations.execute]', error)
    return c.json({ error: { code: 'internal_error', message: 'Envoi impossible' } }, 500)
  }
}
