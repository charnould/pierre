import type { Context } from 'hono'

import type { User } from '../../../utils/_schema'

export const controller = (c: Context) => c.json({ user: c.get('user') as User })
