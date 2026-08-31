import {
  formatOrgCollaboratorLabel,
  resolveOrgUserByLoginOrEmail,
  resolveUserAvatar
} from '@/shared/lib/org-users-cache'
import type { OrgUser } from '@/shared/types/users'

export type OrgUserListFields = {
  photoUrl: string | null
  name: string
  login: string
}

function normalizeQuery(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** L1 of a picker row: custom displayName, else login (else email). */
export function orgUserListName(user: Pick<OrgUser, 'login' | 'email' | 'displayName'>): string {
  const login = user.login.trim()
  const displayName = user.displayName?.trim() ?? ''
  if (displayName && displayName.toLowerCase() !== login.toLowerCase()) return displayName
  return login || user.email.trim()
}

export function orgUserListFields(user: OrgUser): OrgUserListFields {
  return {
    photoUrl: resolveUserAvatar(user.login),
    name: orgUserListName(user),
    login: user.login
  }
}

/** Search haystack for collaborator comboboxes (login + nom + email). */
export function collaboratorSearchLabel(
  user: Pick<OrgUser, 'login' | 'email' | 'displayName'>
): string {
  return [user.login, user.displayName, user.email].filter(Boolean).join(' ')
}

export function resolveOrgUserFromFacetValue(
  value: string,
  users: readonly OrgUser[] = []
): OrgUser | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const fromCache = resolveOrgUserByLoginOrEmail(trimmed)
  if (fromCache) return fromCache

  const lower = trimmed.toLowerCase()
  return (
    users.find((user) => {
      if (user.login.toLowerCase() === lower) return true
      if (user.email.trim().toLowerCase() === lower) return true
      if (orgUserListName(user).toLowerCase() === lower) return true
      if (user.displayName.trim().toLowerCase() === lower) return true
      return false
    }) ?? null
  )
}

export function resolveOrgUserListFields(
  value: string,
  users: readonly OrgUser[] = []
): OrgUserListFields {
  const trimmed = value.trim()
  const user = resolveOrgUserFromFacetValue(trimmed, users)
  if (user) return orgUserListFields(user)
  return {
    photoUrl: resolveUserAvatar(trimmed),
    name: formatOrgCollaboratorLabel(trimmed) || trimmed,
    login: trimmed
  }
}

export function collaboratorFacetMatchesQuery(
  value: string,
  query: string,
  users: readonly OrgUser[] = []
): boolean {
  const q = normalizeQuery(query)
  if (!q) return true
  const fields = resolveOrgUserListFields(value, users)
  return normalizeQuery(fields.name).includes(q) || normalizeQuery(fields.login).includes(q)
}

function userMatchesPickerQuery(user: OrgUser, query: string): boolean {
  const q = normalizeQuery(query)
  if (!q) return true
  return (
    normalizeQuery(user.login).includes(q) ||
    normalizeQuery(user.email).includes(q) ||
    normalizeQuery(user.displayName).includes(q)
  )
}

export function filterOrgUsersForPicker(users: readonly OrgUser[], query: string): OrgUser[] {
  return users
    .filter((user) => userMatchesPickerQuery(user, query))
    .sort((a, b) => orgUserListName(a).localeCompare(orgUserListName(b), 'fr'))
}

export function filterCollaboratorFacetValues(
  values: readonly string[],
  query: string,
  users: readonly OrgUser[] = []
): string[] {
  const q = query.trim()
  if (!q) return [...values]
  return values.filter((value) => collaboratorFacetMatchesQuery(value, q, users))
}
