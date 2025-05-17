import type { Context } from 'hono'
import { get_users } from '../utils/handle-user'
import { view } from '../views/admin.users'

/**
 * Handles the GET request to retrieve and display a list of users.
 *
 * @param c - The context object containing request and response details.
 * @returns A response in HTML format displaying the list of users.
 */
export const controller = (c: Context) => {
  try {
    const users = get_users()
    return c.html(view(users))
  } catch (error) {
    console.error('Error retrieving users:', error)
    return c.html('<p>Internal Server Error</p>', 500)
  }
}
