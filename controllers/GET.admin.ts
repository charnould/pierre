import type { Context } from 'hono'
import { view } from '../views/admin.index'

export const controller = async (c: Context) => c.html(view(c.get('user')))
