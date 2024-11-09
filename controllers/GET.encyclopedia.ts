import type { Context } from 'hono'
import { view } from '../views/encyclopedia'

export const controller = async (c: Context) => c.html(view())
