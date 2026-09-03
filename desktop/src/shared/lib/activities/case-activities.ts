import {
  ACTIVITY_CONTENT_VERSION,
  parse_case_change_content,
  type Activite,
  type ActivityContext,
  type CreateActivityBody
} from '@/shared/types/activites'

import { canonicalizeCaseTags } from './case-workflow-config'
import { extractMentionsFromText } from './mentions'

export type CaseAssignment = {
  email: string | null
  login: string | null
}

const entity_email = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    return value
      .replace(/^user:/, '')
      .trim()
      .toLowerCase()
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as { id?: unknown; label?: unknown }
    const id = typeof record.id === 'string' ? record.id : ''
    if (id)
      return id
        .replace(/^user:/, '')
        .trim()
        .toLowerCase()
  }
  return null
}

export function buildCaseAssignmentActivity(params: {
  contexte: ActivityContext
  ref: string
  user: { login: string; email: string }
  previousEmail: string | null
  comment?: string
}): CreateActivityBody | null {
  const email = params.user.email.trim().toLowerCase()
  const login = params.user.login.trim().toLowerCase()
  if (!email || !login) return null
  const note = params.comment?.trim() ?? ''
  return {
    contexte: params.contexte,
    ref: params.ref,
    type: 'case.assignee_changed',
    recipients: [...new Set([login, ...extractMentionsFromText(note)])],
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      before: params.previousEmail
        ? { id: params.previousEmail, label: params.previousEmail }
        : null,
      after: { id: email, label: login },
      ...(note ? { note } : {})
    })
  }
}

export function deriveCaseAssignment(
  activities: readonly Activite[],
  fallback?: string | null
): CaseAssignment {
  for (const row of activities) {
    if (row.type !== 'case.assignee_changed') continue
    const parsed = parse_case_change_content(row.contenu)
    if (!parsed) continue
    const email = entity_email(parsed.after)
    return {
      email,
      login: email ? (email.includes('@') ? email.slice(0, email.indexOf('@')) : email) : null
    }
  }
  const email = fallback?.trim() || null
  return {
    email,
    login: email ? (email.includes('@') ? email.slice(0, email.indexOf('@')) : email) : null
  }
}

export function buildCaseTagChangeActivity(params: {
  contexte: ActivityContext
  ref: string
  tags: readonly string[]
  previousTags: readonly string[]
  tagOptions?: readonly string[]
  comment?: string
}): CreateActivityBody | null {
  const options = params.tagOptions ?? [
    ...new Set([...params.previousTags, ...params.tags].map((tag) => tag.trim()).filter(Boolean))
  ]
  const tags = canonicalizeCaseTags(params.tags, options)
  const previousTags = canonicalizeCaseTags(params.previousTags, options)
  if (
    tags.length === previousTags.length &&
    tags.every((tag, index) => tag === previousTags[index])
  ) {
    return null
  }
  const note = params.comment?.trim() ?? ''
  const recipients = extractMentionsFromText(note)
  return {
    contexte: params.contexte,
    ref: params.ref,
    type: 'case.tags_changed',
    ...(recipients.length > 0 ? { recipients } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      before: previousTags,
      after: tags,
      ...(note ? { note } : {})
    })
  }
}

export function deriveCaseTags(activities: readonly Activite[]): string[] {
  for (const row of activities) {
    if (row.type !== 'case.tags_changed') continue
    const parsed = parse_case_change_content(row.contenu)
    if (!parsed || !Array.isArray(parsed.after)) continue
    return parsed.after.map((entry) => (typeof entry === 'string' ? entry : entry.label))
  }
  return []
}

export function buildCaseBucketChangeActivity(params: {
  contexte: ActivityContext
  ref: string
  bucket: string
  previousBucket: string | null
  comment?: string
}): CreateActivityBody | null {
  const bucket = params.bucket.trim()
  if (!bucket || bucket === params.previousBucket) return null
  const note = params.comment?.trim() ?? ''
  const recipients = extractMentionsFromText(note)
  return {
    contexte: params.contexte,
    ref: params.ref,
    type: params.contexte === 'repayment' ? 'case.group_changed' : 'case.bucket_changed',
    ...(recipients.length > 0 ? { recipients } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      before: params.previousBucket,
      after: bucket,
      ...(note ? { note } : {})
    })
  }
}

export function deriveCaseBucket(
  activities: readonly Activite[],
  fallbackBucket: string,
  isValid: (bucket: string) => boolean = () => true
): string {
  for (const row of activities) {
    if (row.type !== 'case.bucket_changed' && row.type !== 'case.group_changed') continue
    const parsed = parse_case_change_content(row.contenu)
    const bucket = typeof parsed?.after === 'string' ? parsed.after : null
    if (bucket && isValid(bucket)) return bucket
  }
  return fallbackBucket
}

export function buildEmailImportActivity(params: {
  contexte: ActivityContext
  ref: string
  email: {
    from: string
    to: string
    subject: string
    body: string
    sentAt: string | null
  }
}): CreateActivityBody | null {
  const objet = params.email.subject.trim()
  const corps = params.email.body.trim()
  if (!objet && !corps) return null
  return {
    contexte: params.contexte,
    ref: params.ref,
    type: 'communication.imported',
    channel: 'email',
    ...(params.email.to.trim() ? { destinataire: params.email.to.trim() } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      sender: params.email.from.trim() || 'inconnu',
      body: corps,
      ...(objet ? { subject: objet } : {})
    })
  }
}
