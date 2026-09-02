import { Database } from 'bun:sqlite'

import { parseUserPreferences } from '../../shared/automations'
import { login_from_email } from './activities/rows'
import { datastorePaths } from './paths'

const datastore_path = (): string => datastorePaths().database

export type AvatarMeta = {
  bytes: number
  version: number
}

export function list_avatar_meta(): Map<string, AvatarMeta> {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const rows = db
      .query<{ email: string; bytes: number; version: number }, []>(
        `SELECT email, length(avatar) AS bytes, avatar_version AS version
         FROM users
         WHERE avatar IS NOT NULL`
      )
      .all()
    const map = new Map<string, AvatarMeta>()
    for (const row of rows) map.set(row.email, { bytes: row.bytes, version: row.version })
    return map
  } finally {
    db.close()
  }
}

export function user_has_avatar(email: string): boolean {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = db
      .query<{ present: number }, [string]>(
        'SELECT (avatar IS NOT NULL) AS present FROM users WHERE lower(email) = ? LIMIT 1'
      )
      .get(email.toLowerCase().trim())
    return row?.present === 1
  } finally {
    db.close()
  }
}

export function get_user_avatar(email: string): Uint8Array | null {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = db
      .query<{ avatar: Uint8Array | null }, [string]>(
        'SELECT avatar FROM users WHERE lower(email) = ? LIMIT 1'
      )
      .get(email.toLowerCase().trim())
    return row?.avatar ?? null
  } finally {
    db.close()
  }
}

export function set_user_avatar(email: string, bytes: Uint8Array): number {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const row = db
      .query<{ avatar_version: number }, [Uint8Array, string]>(
        `UPDATE users
         SET avatar = ?, avatar_version = avatar_version + 1
         WHERE lower(email) = ?
         RETURNING avatar_version`
      )
      .get(bytes, email.toLowerCase().trim())
    return row?.avatar_version ?? 0
  } finally {
    db.close()
  }
}

export function clear_user_avatar(email: string): number {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const row = db
      .query<{ avatar_version: number }, [string]>(
        `UPDATE users
         SET avatar = NULL, avatar_version = avatar_version + 1
         WHERE lower(email) = ?
         RETURNING avatar_version`
      )
      .get(email.toLowerCase().trim())
    return row?.avatar_version ?? 0
  } finally {
    db.close()
  }
}

export type UserIdentity = {
  login: string
  email: string
  hasAvatar: boolean
  avatarBytes: number
  avatarVersion: number
  displayName: string
}

export function list_user_identities(): UserIdentity[] {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    return db
      .query<
        {
          email: string
          preferences: string
          avatarBytes: number
          avatarVersion: number
        },
        []
      >(
        `SELECT email, preferences, COALESCE(length(avatar), 0) AS avatarBytes,
                avatar_version AS avatarVersion
         FROM users ORDER BY email`
      )
      .all()
      .map((row) => {
        const login = login_from_email(row.email)
        return {
          login,
          email: row.email,
          hasAvatar: row.avatarBytes > 0,
          avatarBytes: row.avatarBytes,
          avatarVersion: row.avatarVersion,
          displayName: parseUserPreferences(row.preferences).display_name ?? login
        }
      })
  } finally {
    db.close()
  }
}
