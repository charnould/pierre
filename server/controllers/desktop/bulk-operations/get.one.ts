import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { get_bulk_operation } from '../../../utils/bulk/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const bulkOperation = get_bulk_operation(c.req.param('id')!)
  if (!bulkOperation) {
    return c.json({ error: { code: 'not_found', message: 'Bulk operation not found' } }, 404)
  }
  return c.json({ data: bulkOperation })
}
