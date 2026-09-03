import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { BulkOperationsError, delete_bulk_operation } from '../../../utils/bulk/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  try {
    return c.json({
      data: delete_bulk_operation(c.req.param('id')!)
    })
  } catch (error) {
    if (error instanceof BulkOperationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[delete.desktop.bulk-operations]', error)
    return c.json({ error: { code: 'internal_error', message: 'Suppression impossible' } }, 500)
  }
}
