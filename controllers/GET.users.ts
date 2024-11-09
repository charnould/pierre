import type { Context } from 'hono'
import type { User } from '../utils/_schema'
import { get_users } from '../utils/handle-user'
import { view } from '../views/users'

export const controller = async (c: Context) => {
  const users = get_users() as User[]
  return c.html(view(users))
}
