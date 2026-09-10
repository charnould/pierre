import { Database } from 'bun:sqlite'

import { SQL } from 'bun'

import { User as UserSchema, type User } from './_schema'
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

type UserRow = {
  email: string
  is_administrator: number
  module_ids: string
  chatbot_ids: string
  password_hash: string
}

const normalizeUser = (user: User): User => {
  const parsed = UserSchema.parse(user)
  return {
    ...parsed,
    moduleIds: [...new Set(parsed.moduleIds)],
    chatbotIds: [...new Set(parsed.chatbotIds)]
  }
}

const deserializeUser = (row: UserRow): User =>
  normalizeUser({
    email: row.email,
    isAdministrator: row.is_administrator === 1,
    moduleIds: JSON.parse(row.module_ids),
    chatbotIds: JSON.parse(row.chatbot_ids),
    passwordHash: row.password_hash
  })

export const saveUser = async (user: User): Promise<void> => {
  const normalized = normalizeUser(user)
  await getSQL()`
    INSERT INTO users (email, is_administrator, module_ids, chatbot_ids, password_hash)
    VALUES (
      ${normalized.email},
      ${normalized.isAdministrator},
      ${JSON.stringify(normalized.moduleIds)},
      ${JSON.stringify(normalized.chatbotIds)},
      ${normalized.passwordHash}
    )
    ON CONFLICT(email) DO UPDATE SET
      is_administrator = excluded.is_administrator,
      module_ids = excluded.module_ids,
      chatbot_ids = excluded.chatbot_ids,
      password_hash = excluded.password_hash
  `
}

export const createUser = async (user: User): Promise<boolean> => {
  const normalized = normalizeUser(user)
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const result = db
      .query(
        `INSERT OR IGNORE INTO users (
           email, is_administrator, module_ids, chatbot_ids, password_hash
         ) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        normalized.email,
        normalized.isAdministrator ? 1 : 0,
        JSON.stringify(normalized.moduleIds),
        JSON.stringify(normalized.chatbotIds),
        normalized.passwordHash
      )
    return result.changes === 1
  } finally {
    db.close()
  }
}

export const importUserPasswords = async (
  users: ReadonlyArray<{ email: string; passwordHash: string }>
): Promise<{ created: number; updated: number }> => {
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const insert = db.prepare(`
      INSERT INTO users (email, is_administrator, module_ids, chatbot_ids, password_hash)
      VALUES (?, 0, '[]', '[]', ?)
      ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash
    `)
    const exists = db.prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1')
    return db
      .transaction(() => {
        let created = 0
        let updated = 0
        for (const user of users) {
          if (exists.get(user.email)) updated += 1
          else created += 1
          insert.run(user.email, user.passwordHash)
        }
        return { created, updated }
      })
      .immediate()
  } finally {
    db.close()
  }
}

export const getUser = async (email: string): Promise<User | undefined> => {
  const users = await getSQL()`
    SELECT
      email,
      is_administrator,
      module_ids,
      chatbot_ids,
      password_hash
    FROM
      users
    WHERE
      email = ${email.toLowerCase().trim()}
  `

  if (users.length === 0) return undefined

  return deserializeUser(users[0] as UserRow)
}

export const getUsers = async (): Promise<User[]> => {
  const rows = (await getSQL()`
    SELECT
      email,
      is_administrator,
      module_ids,
      chatbot_ids,
      password_hash
    FROM
      users
    ORDER BY
      email
  `) as UserRow[]
  return rows.map(deserializeUser)
}

export const deleteUser = async (email: string): Promise<void> => {
  await getSQL()`
    DELETE FROM users
    WHERE email = ${email.toLowerCase().trim()}
  `
}

type AdministratorMutationResult =
  | { ok: true; user: User }
  | {
      ok: false
      code: 'user_not_found' | 'cannot_demote_self' | 'cannot_delete_self' | 'last_administrator'
    }

export const saveUserAsAdministrator = async (
  actorEmail: string,
  email: string,
  patch: Partial<Pick<User, 'isAdministrator' | 'moduleIds' | 'chatbotIds' | 'passwordHash'>>
): Promise<AdministratorMutationResult> => {
  const normalizedEmail = email.trim().toLowerCase()
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  try {
    return db
      .transaction(() => {
        const existing = db
          .query<UserRow, [string]>('SELECT * FROM users WHERE email = ? LIMIT 1')
          .get(normalizedEmail)
        if (!existing) return { ok: false, code: 'user_not_found' } as const
        const user = normalizeUser({ ...deserializeUser(existing), ...patch })
        if (existing.is_administrator === 1 && !user.isAdministrator) {
          if (user.email === actorEmail.trim().toLowerCase()) {
            return { ok: false, code: 'cannot_demote_self' } as const
          }
          const count = db
            .query<{ count: number }, []>(
              'SELECT COUNT(*) AS count FROM users WHERE is_administrator = 1'
            )
            .get()!.count
          if (count <= 1) return { ok: false, code: 'last_administrator' } as const
        }
        db.query(
          `UPDATE users
         SET is_administrator = ?, module_ids = ?, chatbot_ids = ?, password_hash = ?
         WHERE email = ?`
        ).run(
          user.isAdministrator ? 1 : 0,
          JSON.stringify(user.moduleIds),
          JSON.stringify(user.chatbotIds),
          user.passwordHash,
          user.email
        )
        return { ok: true, user } as const
      })
      .immediate()
  } finally {
    db.close()
  }
}

export const deleteUserAsAdministrator = async (
  actorEmail: string,
  email: string
): Promise<AdministratorMutationResult> => {
  const normalizedEmail = email.trim().toLowerCase()
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  try {
    return db
      .transaction(() => {
        if (normalizedEmail === actorEmail.trim().toLowerCase()) {
          return { ok: false, code: 'cannot_delete_self' } as const
        }
        const existing = db
          .query<UserRow, [string]>('SELECT * FROM users WHERE email = ? LIMIT 1')
          .get(normalizedEmail)
        if (!existing) return { ok: false, code: 'user_not_found' } as const
        if (existing.is_administrator === 1) {
          const count = db
            .query<{ count: number }, []>(
              'SELECT COUNT(*) AS count FROM users WHERE is_administrator = 1'
            )
            .get()!.count
          if (count <= 1) return { ok: false, code: 'last_administrator' } as const
        }
        db.query('DELETE FROM users WHERE email = ?').run(normalizedEmail)
        return { ok: true, user: deserializeUser(existing) } as const
      })
      .immediate()
  } finally {
    db.close()
  }
}

export const deleteAllUsers = async (): Promise<void> => {
  await getSQL()`
    DELETE FROM users;

    VACUUM;
  `
}
