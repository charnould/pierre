import { Database } from 'bun:sqlite'
import { db } from '../utils/database'
import type { User } from './_schema'

//
//
// Save user
export const save_user = async (user: User) => {
  const database = db('telemetry')

  if (database instanceof Database) {
    database
      .prepare(
        'INSERT OR IGNORE INTO users (config, email, role, password_hash) VALUES (?, ?, ?, ?)'
      )
      .run(user.config, user.email, user.role, user.password_hash)
  }

  return
}

//
//
// Get user
export const get_user = (email: string) => {
  const database = db('telemetry')

  if (database instanceof Database) {
    const user = database.prepare('SELECT * FROM users WHERE email = $email').all({ $email: email })

    return user[0]
  }

  throw new Error('Invalid database type for telemetry_db')
}

//
//
// Get all users
export const get_users = () => {
  const database = db('telemetry')

  if (database instanceof Database) {
    const users = database.prepare('SELECT * FROM users ORDER BY email').all()

    return users
  }

  throw new Error('Invalid database type for telemetry_db')
}

//
//
// Delete user
export const delete_user = (email: string) => {
  const database = db('telemetry')

  if (database instanceof Database) {
    return database.prepare('DELETE FROM users WHERE email = $email').run({ $email: email })
  }

  throw new Error('Invalid database type for telemetry_db')
}
