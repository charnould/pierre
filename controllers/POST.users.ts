import type { Context } from 'hono'
import { User } from '../utils/_schema'
import { delete_user, save_user } from '../utils/handle-user'

export const controller = async (c: Context) => {
  // Get variables
  const {
    email,
    password,
    role,
    action
  }: { email: string; password: string; role: string; action: string } = await c.req.parseBody()

  // Create a new user
  if (action === 'create_user') {
    const new_user = User.parse({
      email: email.trim().toLowerCase(),
      role: role.trim().toLowerCase(),
      config: email.trim().toLowerCase().split('@')[1],
      password_hash: await Bun.password.hash(password)
    })

    save_user(new_user)

    return c.redirect('/a/users')
  }

  // Delete a user
  if (action === 'delete_user') {
    delete_user(email)

    return c.redirect('/a/users')
  }
}
