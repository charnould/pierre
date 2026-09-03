import type { Context } from 'hono'

import type { Parsed_User } from '../../../utils/_schema'
import { list_bulk_reports } from '../../../utils/bulk/reports'
import { get_bulk_operation } from '../../../utils/bulk/store'

export const controller = (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const id = c.req.param('id')!
  if (!get_bulk_operation(id)) {
    return c.json({ error: { code: 'not_found', message: 'Bulk operation not found' } }, 404)
  }
  return c.json({ data: list_bulk_reports(id) })
}
