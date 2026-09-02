import { SQL } from 'bun'

import type { Parsed_User, User } from './_schema'
import { datastorePaths } from './paths'

const sql_by_path = new Map<string, SQL>()
const getSQL = () => {
  const path = datastorePaths().database
  let sql = sql_by_path.get(path)
  if (!sql) {
    sql = new SQL(`sqlite:${path}`)
    sql_by_path.set(path, sql)
  }
  return sql
}

/**
 * Saves a user to the database by inserting or replacing the user record.
 *
 * @param user - An object containing the user's email, role, config, and password hash.
 * @returns A promise that resolves when the user has been saved.
 */
export const save_user = async ({ email, role, config, password_hash }: User) =>
  await getSQL()`
    INSERT INTO users (email, role, config, password_hash, preferences)
    VALUES (${email}, ${role}, ${config}, ${password_hash}, '{}')
    ON CONFLICT(email) DO UPDATE SET
      role = excluded.role,
      config = excluded.config,
      password_hash = excluded.password_hash
  `

/**
 * Retrieves a user from the database by their email address.
 *
 * The function performs a case-insensitive and trimmed search for the user.
 * If a user is found, it parses the user's `config` property from a JSON string
 * and returns the user object with the parsed configuration.
 * If no user is found, it returns `undefined`.
 *
 * @param email - The email address of the user to retrieve.
 * @returns A `Parsed_User` object if the user exists, otherwise `undefined`.
 */
export const get_user = async (email: string) => {
  const users = await getSQL()`
    SELECT
      email,
      role,
      config,
      password_hash
    FROM
      users
    WHERE
      email = ${email.toLowerCase().trim()}
  `

  if (users.length === 0) return undefined

  const db_user = users[0] as User
  return { ...db_user, config: JSON.parse(db_user.config) } as Parsed_User
}

/**
 * Retrieves all users from the database, ordered by email, and parses their configuration.
 *
 * @returns {Promise<Parsed_User[]>} A promise that resolves to an array of parsed user objects,
 * where each user's `config` property is parsed from a JSON string.
 *
 * @throws {Error} If the database query fails or if parsing the user configuration fails.
 */
export const get_users = async (): Promise<Parsed_User[]> => {
  const db_users = (await getSQL()`
    SELECT
      email,
      role,
      config,
      password_hash
    FROM
      users
    ORDER BY
      email
  `) as User[]
  const parsed_users = db_users.map((user) => {
    return { ...user, config: JSON.parse(user.config) }
  }) as Parsed_User[]
  return parsed_users
}

/**
 * Deletes all records from the `users` table and performs
 * a VACUUM operation to reclaim database space.
 *
 * This function will remove all user data from the database irreversibly.
 * Use with caution, especially in production environments.
 *
 * @returns A promise that resolves when the operation is complete.
 */
export const delete_all_users = async () =>
  await getSQL()`
    DELETE FROM users;

    VACUUM;
  `
