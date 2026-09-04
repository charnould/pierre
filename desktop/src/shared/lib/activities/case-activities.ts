import {
  ACTIVITY_CONTENT_VERSION,
  activity_payload,
  parse_case_assignment_content,
  parse_case_bucket_change_content,
  parse_case_tag_change_content,
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
    type: 'case_assignment',
    statut: 'logged',
    recipients: [...new Set([login, ...extractMentionsFromText(note)])],
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      referent_precedent: params.previousEmail,
      referent: email,
      login,
      ...(note ? { note } : {})
    })
  }
}

export function deriveCaseAssignment(
  activities: readonly Activite[],
  fallback?: string | null
): CaseAssignment {
  for (const row of activities) {
    if (row.type !== 'case_assignment') continue
    const parsed = parse_case_assignment_content(row.contenu)
    if (!parsed) continue
    return {
      email: parsed.referent,
      login:
        parsed.login ??
        (parsed.referent.includes('@')
          ? parsed.referent.slice(0, parsed.referent.indexOf('@'))
          : parsed.referent)
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
    type: 'case_tag_change',
    statut: 'logged',
    ...(recipients.length > 0 ? { recipients } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      tags_precedents: previousTags,
      tags,
      ...(note ? { note } : {})
    })
  }
}

export function deriveCaseTags(activities: readonly Activite[]): string[] {
  for (const row of activities) {
    if (row.type !== 'case_tag_change') continue
    const parsed = parse_case_tag_change_content(row.contenu)
    if (parsed) return parsed.tags
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
    type: 'case_bucket_change',
    statut: 'logged',
    ...(recipients.length > 0 ? { recipients } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      bucket_precedent: params.previousBucket,
      bucket,
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
    if (row.type !== 'case_bucket_change') continue
    const parsed = parse_case_bucket_change_content(row.contenu)
    if (parsed && isValid(parsed.bucket)) return parsed.bucket
  }
  return fallbackBucket
}

export function caseTransitionNote(row: Activite): string {
  if (row.type === 'case_assignment') {
    return parse_case_assignment_content(row.contenu)?.note ?? ''
  }
  if (row.type === 'case_tag_change') {
    return parse_case_tag_change_content(row.contenu)?.note ?? ''
  }
  if (row.type === 'case_bucket_change') {
    return parse_case_bucket_change_content(row.contenu)?.note ?? ''
  }
  const payload = activity_payload(row.type, row.contenu)
  return typeof payload['note'] === 'string' ? payload['note'] : ''
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
    type: 'email_import',
    statut: 'logged',
    ...(params.email.to.trim() ? { destinataire: params.email.to.trim() } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      ...(objet ? { objet } : {}),
      corps,
      ...(params.email.from.trim() ? { expediteur: params.email.from.trim() } : {}),
      ...(params.email.to.trim() ? { destinataire: params.email.to.trim() } : {}),
      ...(params.email.sentAt ? { date_envoi: params.email.sentAt } : {})
    })
  }
}
