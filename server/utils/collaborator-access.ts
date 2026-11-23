import { Database } from 'bun:sqlite'

import { login_from_email } from './activities/rows'

export type CollaboratorActor = {
  email: string
  isAdministrator?: boolean
}

export function normalizeCollaboratorPrincipal(value: string): string {
  return value.trim().toLowerCase()
}

export function parseMentionsJson(raw: string): string[] {
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === 'string')) {
    throw new Error('Stored mentions must be an array of strings')
  }
  return parsed
}

export function canonicalMentions(
  db: Database,
  values: readonly string[],
  onError: (message: string) => Error
): string[] {
  if (values.length === 0) return []
  const emails = db
    .query<{ email: string }, []>('SELECT lower(email) AS email FROM users')
    .all()
    .map((row) => row.email)
  const emailSet = new Set(emails)
  const byLogin = new Map<string, string[]>()
  for (const email of emails) {
    const login = login_from_email(email)
    byLogin.set(login, [...(byLogin.get(login) ?? []), email])
  }
  return [
    ...new Set(
      values.map((value) => {
        const normalized = normalizeCollaboratorPrincipal(value)
        if (emailSet.has(normalized)) return normalized
        const matches = byLogin.get(normalized) ?? []
        if (matches.length !== 1) {
          throw onError(`Unknown or ambiguous mention: ${value}`)
        }
        return matches[0]!
      })
    )
  ]
}

export function canSeeCollaboratorResource(
  owner: string,
  mentions: readonly string[],
  actor: CollaboratorActor
): boolean {
  if (actor.isAdministrator) return true
  const normalized = normalizeCollaboratorPrincipal(actor.email)
  if (normalizeCollaboratorPrincipal(owner) === normalized) return true
  return mentions.some((mention) => normalizeCollaboratorPrincipal(mention) === normalized)
}

export function canManageCollaboratorResource(owner: string, actor: CollaboratorActor): boolean {
  if (actor.isAdministrator) return true
  return normalizeCollaboratorPrincipal(owner) === normalizeCollaboratorPrincipal(actor.email)
}

export function notificationRecipients(owner: string, mentions: readonly string[]): string[] {
  return [...new Set([owner, ...mentions].map(normalizeCollaboratorPrincipal).filter(Boolean))]
}
