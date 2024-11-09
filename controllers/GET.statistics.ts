import type { Context } from 'hono'
import { view } from '../views/statistics'

export const controller = async (c: Context) => c.html(view())
