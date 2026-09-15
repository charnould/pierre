import { Database } from 'bun:sqlite'

import { User as UserSchema, type User } from './_schema'
import { hashPassword } from './auth'
import { datastorePaths } from './paths'

type UserRow = {
  id: string
  email: string
  role: string | null
  module_ids: string
  chatbot_ids: string
}

export type StoredUser = User & { id: string }

function openDatabase(): Database {
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  db.run('PRAGMA foreign_keys = ON')
  return db
}

const normalizeUser = (user: User): User => {
  const parsed = UserSchema.parse(user)
  return {
    ...parsed,
    moduleIds: [...new Set(parsed.moduleIds)],
    chatbotIds: [...new Set(parsed.chatbotIds)]
  }
}

const deserializeUser = (row: UserRow): StoredUser => ({
  id: row.id,
  ...normalizeUser({
    email: row.email,
    isAdministrator: (row.role ?? '').split(',').includes('admin'),
    moduleIds: JSON.parse(row.module_ids),
    chatbotIds: JSON.parse(row.chatbot_ids)
  })
})

function getStoredUserFromDatabase(db: Database, email: string): StoredUser | undefined {
  const row = db
    .query<UserRow, [string]>(
      `SELECT id, email, role, module_ids, chatbot_ids
       FROM users
       WHERE email = ?`
    )
    .get(email.trim().toLowerCase())
  return row ? deserializeUser(row) : undefined
}

function insertUser(db: Database, user: User, passwordHash: string): void {
  const id = Bun.randomUUIDv7()
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO users
       (id, name, email, emailVerified, createdAt, updatedAt, role, banned, module_ids, chatbot_ids)
     VALUES (?, ?, ?, 0, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      user.email,
      user.email,
      now,
      now,
      user.isAdministrator ? 'admin' : 'user',
      JSON.stringify(user.moduleIds),
      JSON.stringify(user.chatbotIds)
    ]
  )
  db.run(
    `INSERT INTO account
       (id, accountId, providerId, userId, password, createdAt, updatedAt)
     VALUES (?, ?, 'credential', ?, ?, ?, ?)`,
    [Bun.randomUUIDv7(), id, id, passwordHash, now, now]
  )
}

function setPassword(db: Database, userId: string, passwordHash: string): void {
  const now = new Date().toISOString()
  const account = db
    .query<{ id: string }, [string]>(
      `SELECT id FROM account WHERE userId = ? AND providerId = 'credential'`
    )
    .get(userId)
  if (account) {
    db.run('UPDATE account SET password = ?, updatedAt = ? WHERE id = ?', [
      passwordHash,
      now,
      account.id
    ])
  } else {
    db.run(
      `INSERT INTO account
         (id, accountId, providerId, userId, password, createdAt, updatedAt)
       VALUES (?, ?, 'credential', ?, ?, ?, ?)`,
      [Bun.randomUUIDv7(), userId, userId, passwordHash, now, now]
    )
  }
  db.run('DELETE FROM session WHERE userId = ?', [userId])
}

export const getStoredUser = async (email: string): Promise<StoredUser | undefined> => {
  using db = openDatabase()
  return getStoredUserFromDatabase(db, email)
}

export const getUser = async (email: string): Promise<User | undefined> => {
  const stored = await getStoredUser(email)
  if (!stored) return undefined
  const { id: _id, ...user } = stored
  return user
}

export const getUsers = async (): Promise<User[]> => {
  using db = openDatabase()
  const rows = db
    .query<UserRow, []>(
      `SELECT id, email, role, module_ids, chatbot_ids
       FROM users
       ORDER BY email`
    )
    .all()
  return rows.map((row) => {
    const { id: _id, ...user } = deserializeUser(row)
    return user
  })
}

export const createUser = async (input: User & { password: string }): Promise<boolean> => {
  const user = normalizeUser(input)
  const passwordHash = await hashPassword(input.password)
  using db = openDatabase()
  const create = db.transaction(() => {
    if (getStoredUserFromDatabase(db, user.email)) return false
    insertUser(db, user, passwordHash)
    return true
  })
  return create.immediate()
}

type AdministratorMutationResult =
  | { ok: true; user: User }
  | {
      ok: false
      code: 'user_not_found' | 'cannot_demote_self' | 'cannot_delete_self' | 'last_administrator'
    }

const countAdministrators = (db: Database): number =>
  db
    .query<{ count: number }, []>(
      `SELECT COUNT(*) AS count
       FROM users
       WHERE ',' || COALESCE(role, '') || ',' LIKE '%,admin,%'`
    )
    .get()!.count

export const saveUserAsAdministrator = async (
  actorEmail: string,
  email: string,
  patch: Partial<Pick<User, 'isAdministrator' | 'moduleIds' | 'chatbotIds'>> & {
    password?: string
  }
): Promise<AdministratorMutationResult> => {
  const normalizedEmail = email.trim().toLowerCase()
  const passwordHash = patch.password === undefined ? undefined : await hashPassword(patch.password)
  using db = openDatabase()
  const save = db.transaction((): AdministratorMutationResult => {
    const existing = getStoredUserFromDatabase(db, normalizedEmail)
    if (!existing) return { ok: false, code: 'user_not_found' }

    if (existing.isAdministrator && patch.isAdministrator === false) {
      if (normalizedEmail === actorEmail.trim().toLowerCase()) {
        return { ok: false, code: 'cannot_demote_self' }
      }
      if (countAdministrators(db) <= 1) {
        return { ok: false, code: 'last_administrator' }
      }
    }

    const user = normalizeUser({
      email: normalizedEmail,
      isAdministrator: patch.isAdministrator ?? existing.isAdministrator,
      moduleIds: patch.moduleIds ?? existing.moduleIds,
      chatbotIds: patch.chatbotIds ?? existing.chatbotIds
    })
    db.run(
      `UPDATE users
       SET role = ?, module_ids = ?, chatbot_ids = ?, updatedAt = ?
       WHERE id = ?`,
      [
        user.isAdministrator ? 'admin' : 'user',
        JSON.stringify(user.moduleIds),
        JSON.stringify(user.chatbotIds),
        new Date().toISOString(),
        existing.id
      ]
    )
    if (passwordHash !== undefined) setPassword(db, existing.id, passwordHash)
    return { ok: true, user }
  })
  return save.immediate()
}

export const deleteUserAsAdministrator = async (
  actorEmail: string,
  email: string
): Promise<AdministratorMutationResult> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === actorEmail.trim().toLowerCase()) {
    return { ok: false, code: 'cannot_delete_self' }
  }
  using db = openDatabase()
  const remove = db.transaction((): AdministratorMutationResult => {
    const existing = getStoredUserFromDatabase(db, normalizedEmail)
    if (!existing) return { ok: false, code: 'user_not_found' }
    if (existing.isAdministrator && countAdministrators(db) <= 1) {
      return { ok: false, code: 'last_administrator' }
    }
    db.run('DELETE FROM users WHERE id = ?', [existing.id])
    return { ok: true, user: existing }
  })
  return remove.immediate()
}

export const importUserPasswords = async (
  users: ReadonlyArray<{ email: string; password: string }>
): Promise<{ created: number; updated: number }> => {
  const prepared: Array<{ email: string; passwordHash: string }> = []
  for (const user of users) {
    prepared.push({
      email: UserSchema.shape.email.parse(user.email),
      passwordHash: await hashPassword(user.password)
    })
  }
  using db = openDatabase()
  const importUsers = db.transaction(() => {
    let created = 0
    let updated = 0
    for (const user of prepared) {
      const existing = getStoredUserFromDatabase(db, user.email)
      if (existing) {
        setPassword(db, existing.id, user.passwordHash)
        updated += 1
      } else {
        insertUser(
          db,
          {
            email: user.email,
            isAdministrator: false,
            moduleIds: [],
            chatbotIds: []
          },
          user.passwordHash
        )
        created += 1
      }
    }
    return { created, updated }
  })
  return importUsers.immediate()
}

export const deleteAllUsers = async (): Promise<void> => {
  using db = openDatabase()
  const remove = db.transaction(() => {
    db.run('DELETE FROM session')
    db.run('DELETE FROM account')
    db.run('DELETE FROM verification')
    db.run('DELETE FROM users')
  })
  remove.immediate()
}
