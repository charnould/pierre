import type { OrgUser } from '@/shared/types/users'

import { bytesToDataUri } from './avatar/data-uri'
import { parseActivityAuthor } from './timeline/parse-activity-author'

const cache = new Map<string, OrgUser[]>()
const inflight = new Map<string, Promise<OrgUser[]>>()
const photoByLogin = new Map<string, string>()
const bytesByLogin = new Map<string, number>()
const userByLogin = new Map<string, OrgUser>()
const userByEmail = new Map<string, OrgUser>()
const photoInflight = new Map<string, Promise<void>>()
let cacheVersion = 0
let activeUrl = ''
let activationVersion = 0
const cacheListeners = new Set<() => void>()

function bump(): void {
  cacheVersion += 1
  for (const listener of cacheListeners) listener()
}

const normalizedUrl = (url: string): string => {
  try {
    return new URL(url).toString().replace(/\/$/, '')
  } catch {
    return url.replace(/\/$/, '')
  }
}
const photoKey = (url: string, email: string): string =>
  `${normalizedUrl(url)}\0${email.trim().toLowerCase()}`

function indexOrgUsers(url: string, users: OrgUser[]): void {
  activeUrl = normalizedUrl(url)
  userByLogin.clear()
  userByEmail.clear()
  const usersByLogin = new Map<string, OrgUser[]>()
  for (const user of users) {
    const loginKey = user.login.toLowerCase()
    usersByLogin.set(loginKey, [...(usersByLogin.get(loginKey) ?? []), user])
    const emailKey = user.email.trim().toLowerCase()
    if (emailKey) userByEmail.set(emailKey, user)
    if (!user.hasAvatar) {
      photoByLogin.delete(photoKey(activeUrl, emailKey))
      bytesByLogin.delete(photoKey(activeUrl, emailKey))
    }
  }
  for (const [login, matches] of usersByLogin) {
    if (matches.length === 1) userByLogin.set(login, matches[0]!)
  }
  bump()
}

function hydratePhotos(url: string, users: OrgUser[]): void {
  if (!window.api?.getAvatar) return
  for (const user of users) {
    if (!user.hasAvatar) continue
    const emailKey = user.email.trim().toLowerCase()
    const cacheKey = photoKey(url, emailKey)
    const version = user.avatarVersion
    if (bytesByLogin.get(cacheKey) === version && photoByLogin.has(cacheKey)) continue
    const key = `${cacheKey}:${version}`
    if (photoInflight.has(key)) continue
    const pending = (async () => {
      try {
        const bytes = await window.api.getAvatar({ url, email: user.email })
        if (!bytes) return
        photoByLogin.set(cacheKey, bytesToDataUri(bytes, 'image/webp'))
        bytesByLogin.set(cacheKey, version)
        bump()
      } finally {
        photoInflight.delete(key)
      }
    })()
    photoInflight.set(key, pending)
  }
}

/** Fetches org users for a server URL, with in-memory cache + in-flight dedupe. */
export async function fetchOrgUsers(url: string): Promise<OrgUser[]> {
  const activation = ++activationVersion
  const hit = cache.get(url)
  if (hit) {
    indexOrgUsers(url, hit)
    hydratePhotos(url, hit)
    return hit
  }

  let pending = inflight.get(url)
  if (!pending) {
    pending = (async () => {
      try {
        if (!window.api?.getUsers) return []
        const res = await window.api.getUsers({ url })
        if (!res) return []
        const users = res.users ?? []
        cache.set(url, users)
        return users
      } finally {
        inflight.delete(url)
      }
    })()
    inflight.set(url, pending)
  }
  const users = await pending
  if (activation === activationVersion) {
    indexOrgUsers(url, users)
    hydratePhotos(url, users)
  }
  return users
}

export async function resolveOrgUsersUrl(url: string | undefined): Promise<string | undefined> {
  if (url) return url
  const settings = await window.api?.getSettings?.()
  return settings?.url
}

/** Login key from a raw login or email (`alice` / `alice@bailleur.fr` → `alice`). */
function loginKeyFrom(raw: string): string {
  const lower = raw.trim().toLowerCase()
  const at = lower.indexOf('@')
  return at > 0 ? lower.slice(0, at) : lower
}

/** Sync lookup of a collaborator by login, email, or email local-part. */
export function resolveOrgUser(login: string): OrgUser | null {
  return resolveOrgUserByLoginOrEmail(login)
}

/** Sync lookup by login, email, or email local-part (populated by fetchOrgUsers). */
export function resolveOrgUserByLoginOrEmail(raw: string): OrgUser | null {
  const id = parseActivityAuthor(raw).id
  if (!id) return null
  const lower = id.toLowerCase()

  const byEmail = userByEmail.get(lower)
  if (byEmail) return byEmail

  const loginKey = loginKeyFrom(lower)
  if (!loginKey) return null
  return userByLogin.get(loginKey) ?? null
}

/**
 * Collaborator label for tables / dossier: custom displayName → login → email.
 * `displayName` from the API always falls back to login; treat equal (case-insensitive)
 * as “no custom name”.
 * Optional `fallbackLogin` wins over raw email when the collaborator is unknown to the org cache.
 */
export function formatOrgCollaboratorLabel(raw: string, fallbackLogin?: string | null): string {
  const trimmed = raw.trim()
  const loginHint = fallbackLogin?.trim() ?? ''

  const user = resolveOrgUserByLoginOrEmail(trimmed || loginHint)
  if (user) {
    const login = user.login.trim()
    const displayName = user.displayName?.trim() ?? ''
    if (displayName && displayName.toLowerCase() !== login.toLowerCase()) return displayName
    if (login) return login
    return user.email.trim() || trimmed || loginHint
  }

  if (loginHint) return loginHint
  return trimmed
}

/** Sync lookup of a collaborator's photo data-URI by login, email, or email local-part. */
export function resolveUserAvatar(login: string): string | null {
  const user = resolveOrgUserByLoginOrEmail(login)
  if (user) return photoByLogin.get(photoKey(activeUrl, user.email)) ?? null
  const key = login.trim().toLowerCase()
  if (!key) return null
  return photoByLogin.get(photoKey(activeUrl, key)) ?? null
}

export function subscribeOrgUsersCache(listener: () => void): () => void {
  cacheListeners.add(listener)
  return () => {
    cacheListeners.delete(listener)
  }
}

export function getOrgUsersCacheVersion(): number {
  return cacheVersion
}

/** After upload / reset — update local photo/name and drop list cache. `undefined` photo leaves it. */
export function applyLocalAvatar(
  login: string,
  photoUrl: string | null | undefined,
  displayName?: string,
  url: string = activeUrl
): void {
  const loginKey = loginKeyFrom(login)
  if (!loginKey) return
  const existing = userByEmail.get(login.trim().toLowerCase()) ?? userByLogin.get(loginKey) ?? null
  const avatarKey = photoKey(url, existing?.email ?? login)
  if (photoUrl !== undefined) {
    if (photoUrl) photoByLogin.set(avatarKey, photoUrl)
    else {
      photoByLogin.delete(avatarKey)
      bytesByLogin.delete(avatarKey)
    }
  }
  if (existing) {
    const next = {
      ...existing,
      hasAvatar: photoUrl === undefined ? existing.hasAvatar : Boolean(photoUrl),
      avatarBytes:
        photoUrl === undefined ? existing.avatarBytes : photoUrl ? existing.avatarBytes : 0,
      ...(displayName !== undefined ? { displayName } : {})
    }
    if (userByLogin.get(existing.login.toLowerCase()) === existing) {
      userByLogin.set(existing.login.toLowerCase(), next)
    }
    const emailKey = existing.email.trim().toLowerCase()
    if (emailKey) userByEmail.set(emailKey, next)
  }
  bump()
  cache.clear()
  inflight.clear()
}

/** Sync display name for a login or email (custom or login fallback). */
export function resolveOrgUserDisplayName(login: string): string {
  const user = resolveOrgUserByLoginOrEmail(login)
  const name = user?.displayName?.trim()
  if (name) return name
  return login.trim()
}

/** Test helper — clears the module cache between unit tests. */
export function clearOrgUsersCache(): void {
  cache.clear()
  inflight.clear()
  photoByLogin.clear()
  bytesByLogin.clear()
  photoInflight.clear()
  userByLogin.clear()
  userByEmail.clear()
  activeUrl = ''
  activationVersion = 0
  bump()
}
