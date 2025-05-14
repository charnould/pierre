import { db } from '../utils/database'
import type { Parsed_User, User } from './_schema'

/**
 * Saves a user to the database. If a user with the same email already exists,
 * it will be replaced with the new data.
 *
 * @param user - The user object containing the following properties:
 *   - `email` (string): The email address of the user.
 *   - `role` (string): The role assigned to the user.
 *   - `config` (any): The configuration data associated with the user.
 *   - `password_hash` (string): The hashed password of the user.
 *
 * @returns The result of the database operation.
 * @throws Will throw an error if the database operation fails.
 *
 */
export const save_user = (user: User) => {
  try {
    return db('datastore')
      .prepare(
        'INSERT OR REPLACE INTO users (email, role, config, password_hash) VALUES (?, ?, ?, ?)'
      )
      .run(user.email, user.role, user.config, user.password_hash)
  } catch (error) {
    console.error('Failed to save user:', error)
    throw error
  }
}

/**
 * Retrieves a user from the database by their email address.
 *
 * @param email - The email address of the user to retrieve.
 * @returns The user object with parsed configuration if found, or `undefined` if no user exists with the given email.
 * @throws Will throw an error if the database query fails.
 *
 */
export const get_user = (email: string) => {
  try {
    const users = db('datastore')
      .prepare('SELECT * FROM users WHERE email = $email')
      .all({ $email: email.toLowerCase() })

    if (users.length === 0) return undefined

    const db_user = users[0] as User
    return { ...db_user, config: JSON.parse(db_user.config) } as Parsed_User
  } catch (error) {
    console.error('Failed to retrieve user:', error)
    throw error
  }
}

/**
 * Retrieves and parses a list of users from the database.
 *
 * @returns {Parsed_User[]} An array of parsed user objects, where each user's `config` field
 * is converted from a JSON string to an object.
 *
 * @throws Will throw an error if the database query fails or if there is an issue
 * parsing the `config` field of any user.
 *
 */
export const get_users = (): Parsed_User[] => {
  try {
    const db_users = db('datastore').prepare('SELECT * FROM users ORDER BY email').all() as User[]
    const parsed_users = db_users.map((user) => {
      return { ...user, config: JSON.parse(user.config) }
    })
    return parsed_users
  } catch (error) {
    console.error('Failed to retrieve users:', error)
    throw error
  }
}

/**
 * Deletes all users from the database and performs a database vacuum operation
 * to reclaim unused space.
 *
 * @throws {Error} Throws an error if the operation fails.
 *
 */
export const delete_all_users = () => {
  try {
    db('datastore').prepare('DELETE FROM users').run()
    db('datastore').prepare('VACUUM').run()
    return
  } catch (error) {
    console.error('Failed to delete all users:', error)
    throw error
  }
}
