import { filterOrgUsersForPicker } from '@/shared/lib/org-user-list-item'
import { resolveOrgUserDisplayName } from '@/shared/lib/org-users-cache'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import type { OrgUser } from '@/shared/types/users'

const MENTION_TOKEN_RE = /@([a-z0-9._-]+)/gi

export function extractMentionsFromText(text: string): string[] {
  const logins = new Set<string>()
  for (const match of text.matchAll(MENTION_TOKEN_RE)) {
    const login = match[1]?.toLowerCase()
    if (login) logins.add(login)
  }
  return [...logins]
}

export type MentionSuggestion =
  | { kind: 'agent'; handle: string; name: string }
  | { kind: 'user'; user: OrgUser }

export function filterMentionSuggestions(
  users: OrgUser[],
  query: string,
  agent: { handle: string; name: string }
): MentionSuggestion[] {
  const normalizedQuery = query.trim().toLowerCase()
  const suggestions: MentionSuggestion[] = []
  if (
    !normalizedQuery ||
    agent.handle.includes(normalizedQuery) ||
    agent.name.toLowerCase().includes(normalizedQuery)
  ) {
    suggestions.push({ kind: 'agent', ...agent })
  }
  suggestions.push(
    ...filterOrgUsersForPicker(
      users.filter((user) => user.login.toLowerCase() !== agent.handle),
      query
    ).map((user): MentionSuggestion => ({ kind: 'user', user }))
  )
  return suggestions.slice(0, 8)
}

export interface MentionTrigger {
  start: number
  query: string
}

export function getMentionTriggerAtCaret(text: string, caret: number): MentionTrigger | null {
  const before = text.slice(0, caret)
  const match = /(^|[\s(,])@([a-z0-9._-]*)$/i.exec(before)
  if (!match) return null
  const query = match[2] ?? ''
  const start = caret - query.length - 1
  return { start, query }
}

export function insertMentionAt(
  text: string,
  trigger: MentionTrigger,
  login: string,
  caret: number
): { nextText: string; nextCaret: number } {
  const before = text.slice(0, trigger.start)
  const after = text.slice(caret)
  const mention = `@${login} `
  const nextText = `${before}${mention}${after}`
  const nextCaret = before.length + mention.length
  return { nextText, nextCaret }
}

export function replyAuthorMentionSeed(auteur: string, currentUser: string): string {
  const parsed = parseActivityAuthor(auteur)
  if (parsed.kind !== 'user' && parsed.kind !== 'unknown') return ''
  const id = (parsed.id || parsed.label).trim()
  if (!id) return ''
  const login = id.includes('@') ? id.slice(0, id.indexOf('@')) : id
  const current = currentUser.trim().toLowerCase()
  const currentLogin = current.includes('@') ? current.slice(0, current.indexOf('@')) : current
  if (!login) return ''
  if (id.toLowerCase() === current || login.toLowerCase() === currentLogin) return ''
  return `@${login} `
}

export function formatMentionDisplay(raw: string): string {
  if (!raw) return raw
  const id = parseActivityAuthor(raw).id
  if (!id) return raw
  const login = id.includes('@') ? id.slice(0, id.indexOf('@')) : id
  const fromOrg = resolveOrgUserDisplayName(id)
  if (
    fromOrg &&
    fromOrg.toLowerCase() !== login.toLowerCase() &&
    fromOrg.toLowerCase() !== id.toLowerCase()
  ) {
    return fromOrg
  }
  if (!login) return raw
  return login.charAt(0).toUpperCase() + login.slice(1)
}

export function splitTextWithMentions(
  text: string
): Array<{ type: 'text' | 'mention'; value: string }> {
  const parts: Array<{ type: 'text' | 'mention'; value: string }> = []
  let lastIndex = 0

  for (const match of text.matchAll(MENTION_TOKEN_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) })
    }
    parts.push({ type: 'mention', value: match[1] ?? '' })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}
