import { Database } from 'bun:sqlite'

import { User as UserSchema, type User } from './_schema'
import { hashPassword } from './auth'
import { datastorePaths } from './paths'

type UserRow = {
  id: string
  email: string
  role: string | null
  profile_id: string | null
  user_module_ids: string
  user_chatbot_ids: string
  profile_module_ids: string | null
  profile_chatbot_ids: string | null
}

type ProfileRow = {
  id: string
  name: string
  module_ids: string
  chatbot_ids: string
}

export type UserProfile = {
  id: string
  name: string
  moduleIds: User['moduleIds']
  chatbotIds: string[]
}

export type AdminUser = User & { profileId: string | null }

export type StoredUser = AdminUser & { id: string }

export type UserWrite = User & { password: string; profileId: string | null }

type UserAccess =
  | { profileId: string }
  | { profileId: null; moduleIds: User['moduleIds']; chatbotIds: string[] }

const USER_SELECT = `SELECT users.id, users.email, users.role, users.profile_id,
       users.module_ids AS user_module_ids,
       users.chatbot_ids AS user_chatbot_ids,
       user_profiles.module_ids AS profile_module_ids,
       user_profiles.chatbot_ids AS profile_chatbot_ids
FROM users
LEFT JOIN user_profiles ON users.profile_id = user_profiles.id`

function openDatabase(): Database {
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  db.run('PRAGMA foreign_keys = ON')
  return db
}

const normalizeAccess = (access: Pick<User, 'moduleIds' | 'chatbotIds'>) => {
  const parsed = {
    moduleIds: UserSchema.shape.moduleIds.parse(access.moduleIds),
    chatbotIds: UserSchema.shape.chatbotIds.parse(access.chatbotIds)
  }
  return {
    moduleIds: [...new Set(parsed.moduleIds)],
    chatbotIds: [...new Set(parsed.chatbotIds)]
  }
}

const normalizeUser = (user: User): User => {
  const parsed = UserSchema.parse(user)
  return { ...parsed, ...normalizeAccess(parsed) }
}

const normalizeProfile = (profile: UserProfile): UserProfile => ({
  id: profile.id,
  name: profile.name.trim(),
  ...normalizeAccess(profile)
})

const accessColumns = (access: UserAccess) => {
  if (access.profileId !== null) {
    return { profileId: access.profileId, moduleIds: '[]', chatbotIds: '[]' }
  }
  const normalized = normalizeAccess(access)
  return {
    profileId: null,
    moduleIds: JSON.stringify(normalized.moduleIds),
    chatbotIds: JSON.stringify(normalized.chatbotIds)
  }
}

const accessFromPatch = (
  existing: AdminUser,
  patch: Partial<Pick<User, 'moduleIds' | 'chatbotIds'>> & { profileId?: string | null }
): UserAccess => {
  if (patch.profileId) return { profileId: patch.profileId }
  if (patch.profileId === null || !existing.profileId) {
    return {
      profileId: null,
      moduleIds: patch.moduleIds ?? existing.moduleIds,
      chatbotIds: patch.chatbotIds ?? existing.chatbotIds
    }
  }
  return { profileId: existing.profileId }
}

const deserializeProfile = (row: ProfileRow): UserProfile =>
  normalizeProfile({
    id: row.id,
    name: row.name,
    moduleIds: JSON.parse(row.module_ids),
    chatbotIds: JSON.parse(row.chatbot_ids)
  })

const deserializeUser = (row: UserRow): StoredUser => {
  const profileId = row.profile_id
  let moduleIdsJson = row.user_module_ids
  let chatbotIdsJson = row.user_chatbot_ids
  if (profileId) {
    if (row.profile_module_ids === null || row.profile_chatbot_ids === null) {
      throw new Error(`User ${row.email} references missing profile ${profileId}`)
    }
    moduleIdsJson = row.profile_module_ids
    chatbotIdsJson = row.profile_chatbot_ids
  }
  return {
    id: row.id,
    profileId,
    ...normalizeUser({
      email: row.email,
      isAdministrator: (row.role ?? '').split(',').includes('admin'),
      moduleIds: JSON.parse(moduleIdsJson),
      chatbotIds: JSON.parse(chatbotIdsJson)
    })
  }
}

const toUser = ({ id: _id, profileId: _profileId, ...user }: StoredUser): User => user

const toAdminUser = ({ id: _id, ...user }: StoredUser): AdminUser => user

function getStoredUserFromDatabase(db: Database, email: string): StoredUser | undefined {
  const row = db
    .query<UserRow, [string]>(`${USER_SELECT} WHERE users.email = ?`)
    .get(email.trim().toLowerCase())
  return row ? deserializeUser(row) : undefined
}

function getProfileFromDatabase(db: Database, id: string): UserProfile | undefined {
  const row = db
    .query<ProfileRow, [string]>(
      `SELECT id, name, module_ids, chatbot_ids FROM user_profiles WHERE id = ?`
    )
    .get(id)
  return row ? deserializeProfile(row) : undefined
}

function findProfileIdByName(db: Database, name: string): string | undefined {
  return db.query<{ id: string }, [string]>(`SELECT id FROM user_profiles WHERE name = ?`).get(name)
    ?.id
}

function insertUser(db: Database, user: User & { profileId: string | null }, passwordHash: string) {
  const id = Bun.randomUUIDv7()
  const now = new Date().toISOString()
  const columns = accessColumns(
    user.profileId
      ? { profileId: user.profileId }
      : { profileId: null, moduleIds: user.moduleIds, chatbotIds: user.chatbotIds }
  )
  db.run(
    `INSERT INTO users
       (id, name, email, emailVerified, createdAt, updatedAt, role, banned, module_ids, chatbot_ids, profile_id)
     VALUES (?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      user.email,
      user.email,
      now,
      now,
      user.isAdministrator ? 'admin' : 'user',
      columns.moduleIds,
      columns.chatbotIds,
      columns.profileId
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
  return stored ? toUser(stored) : undefined
}

export const getUsers = async (): Promise<User[]> => {
  using db = openDatabase()
  return db
    .query<UserRow, []>(`${USER_SELECT} ORDER BY users.email`)
    .all()
    .map((row) => toUser(deserializeUser(row)))
}

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  using db = openDatabase()
  return db
    .query<UserRow, []>(`${USER_SELECT} ORDER BY users.email`)
    .all()
    .map((row) => toAdminUser(deserializeUser(row)))
}

export const getUserProfiles = async (): Promise<UserProfile[]> => {
  using db = openDatabase()
  return db
    .query<ProfileRow, []>(
      `SELECT id, name, module_ids, chatbot_ids FROM user_profiles ORDER BY name`
    )
    .all()
    .map(deserializeProfile)
}

type CreateUserResult =
  | { ok: true; user: AdminUser }
  | { ok: false; code: 'user_exists' | 'profile_not_found' }

export const createUser = async (input: UserWrite): Promise<CreateUserResult> => {
  const user = normalizeUser(input)
  const passwordHash = await hashPassword(input.password)
  using db = openDatabase()
  const create = db.transaction((): CreateUserResult => {
    if (getStoredUserFromDatabase(db, user.email)) return { ok: false, code: 'user_exists' }
    if (input.profileId) {
      const profile = getProfileFromDatabase(db, input.profileId)
      if (!profile) return { ok: false, code: 'profile_not_found' }
      insertUser(db, { ...user, profileId: input.profileId }, passwordHash)
      return {
        ok: true,
        user: {
          ...user,
          profileId: input.profileId,
          moduleIds: profile.moduleIds,
          chatbotIds: profile.chatbotIds
        }
      }
    }
    insertUser(db, { ...user, profileId: null }, passwordHash)
    return { ok: true, user: { ...user, profileId: null } }
  })
  return create.immediate()
}

type UserGuardCode =
  | 'user_not_found'
  | 'cannot_demote_self'
  | 'cannot_delete_self'
  | 'last_administrator'

type SaveUserResult =
  | { ok: true; user: AdminUser }
  | { ok: false; code: UserGuardCode | 'profile_not_found' }

type DeleteUserResult = { ok: true; user: AdminUser } | { ok: false; code: UserGuardCode }

type ProfileMutationResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; code: 'profile_not_found' | 'profile_in_use' | 'profile_name_taken' }

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
    profileId?: string | null
  }
): Promise<SaveUserResult> => {
  const normalizedEmail = email.trim().toLowerCase()
  const passwordHash = patch.password === undefined ? undefined : await hashPassword(patch.password)
  using db = openDatabase()
  const save = db.transaction((): SaveUserResult => {
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

    const access = accessFromPatch(existing, patch)
    const isAdministrator = patch.isAdministrator ?? existing.isAdministrator
    let user: AdminUser
    if (access.profileId === null) {
      user = {
        email: normalizedEmail,
        isAdministrator,
        profileId: null,
        ...normalizeAccess(access)
      }
    } else {
      const profile = getProfileFromDatabase(db, access.profileId)
      if (!profile) return { ok: false, code: 'profile_not_found' }
      user = {
        email: normalizedEmail,
        isAdministrator,
        profileId: profile.id,
        moduleIds: profile.moduleIds,
        chatbotIds: profile.chatbotIds
      }
    }

    const columns = accessColumns(access)
    db.run(
      `UPDATE users
       SET role = ?, profile_id = ?, module_ids = ?, chatbot_ids = ?, updatedAt = ?
       WHERE id = ?`,
      [
        user.isAdministrator ? 'admin' : 'user',
        columns.profileId,
        columns.moduleIds,
        columns.chatbotIds,
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
): Promise<DeleteUserResult> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === actorEmail.trim().toLowerCase()) {
    return { ok: false, code: 'cannot_delete_self' }
  }
  using db = openDatabase()
  const remove = db.transaction((): DeleteUserResult => {
    const existing = getStoredUserFromDatabase(db, normalizedEmail)
    if (!existing) return { ok: false, code: 'user_not_found' }
    if (existing.isAdministrator && countAdministrators(db) <= 1) {
      return { ok: false, code: 'last_administrator' }
    }
    db.run('DELETE FROM users WHERE id = ?', [existing.id])
    return { ok: true, user: toAdminUser(existing) }
  })
  return remove.immediate()
}

export const createUserProfile = async (
  input: Omit<UserProfile, 'id'>
): Promise<ProfileMutationResult> => {
  const name = input.name.trim()
  using db = openDatabase()
  const create = db.transaction((): ProfileMutationResult => {
    if (findProfileIdByName(db, name)) return { ok: false, code: 'profile_name_taken' }
    const profile = normalizeProfile({
      id: Bun.randomUUIDv7(),
      name,
      moduleIds: input.moduleIds,
      chatbotIds: input.chatbotIds
    })
    db.run(`INSERT INTO user_profiles (id, name, module_ids, chatbot_ids) VALUES (?, ?, ?, ?)`, [
      profile.id,
      profile.name,
      JSON.stringify(profile.moduleIds),
      JSON.stringify(profile.chatbotIds)
    ])
    return { ok: true, profile }
  })
  return create.immediate()
}

export const saveUserProfile = async (
  id: string,
  patch: Partial<Omit<UserProfile, 'id'>>
): Promise<ProfileMutationResult> => {
  using db = openDatabase()
  const save = db.transaction((): ProfileMutationResult => {
    const existing = getProfileFromDatabase(db, id)
    if (!existing) return { ok: false, code: 'profile_not_found' }
    const name = (patch.name ?? existing.name).trim()
    const owner = findProfileIdByName(db, name)
    if (owner && owner !== id) return { ok: false, code: 'profile_name_taken' }
    const profile = normalizeProfile({
      id,
      name,
      moduleIds: patch.moduleIds ?? existing.moduleIds,
      chatbotIds: patch.chatbotIds ?? existing.chatbotIds
    })
    db.run(`UPDATE user_profiles SET name = ?, module_ids = ?, chatbot_ids = ? WHERE id = ?`, [
      profile.name,
      JSON.stringify(profile.moduleIds),
      JSON.stringify(profile.chatbotIds),
      id
    ])
    return { ok: true, profile }
  })
  return save.immediate()
}

export const deleteUserProfile = async (id: string): Promise<ProfileMutationResult> => {
  using db = openDatabase()
  const remove = db.transaction((): ProfileMutationResult => {
    const existing = getProfileFromDatabase(db, id)
    if (!existing) return { ok: false, code: 'profile_not_found' }
    const used = db
      .query<{ count: number }, [string]>(
        `SELECT COUNT(*) AS count FROM users WHERE profile_id = ?`
      )
      .get(id)!.count
    if (used > 0) return { ok: false, code: 'profile_in_use' }
    db.run('DELETE FROM user_profiles WHERE id = ?', [id])
    return { ok: true, profile: existing }
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
            chatbotIds: [],
            profileId: null
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
    db.run('DELETE FROM user_profiles')
  })
  remove.immediate()
}
