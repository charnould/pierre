import type { Context } from 'hono'

import type { User } from '../../../utils/_schema'
import { list_bulk_operations } from '../../../utils/bulk/store'

export const controller = async (c: Context) => {
  const user = c.get('user') as User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  return c.json({ data: list_bulk_operations() })
}
