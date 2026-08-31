import type { CreateActivityBody } from '@/shared/types/activites'
import { ACTIVITY_CONTENT_VERSION } from '@/shared/types/activites'
import type { RepaymentNotificationChannel } from '@/shared/types/notification-repayment'

import type { RepaymentBucketId } from './repayment-bucket'
import { extractMentionsFromText } from './repayment-mention'
import { canonicalizeRepaymentTags, sameRepaymentTagSet } from './repayment-tags'

export type RepaymentMessageOptions = {
  objet?: string
  action?: string
  destinataire?: string
  /** Template `channel: mailto` — journalise sans envoyer via l’API courriel. */
  transport?: 'mailto'
}

export function buildRepaymentMessageActivity(
  ref: string,
  comment: string,
  channel: RepaymentNotificationChannel,
  options?: RepaymentMessageOptions
): CreateActivityBody | null {
  const contenu = comment.trim()
  const objet = options?.objet?.trim() ?? ''
  const action = options?.action?.trim() ?? ''

  if (channel === 'email') {
    if (!action || (!objet && !contenu)) return null
  } else if (channel === 'rcs') {
    if (!action || !contenu) return null
  } else if (!contenu) {
    return null
  }

  return {
    contexte: 'repayment',
    ref,
    type: channel,
    statut: channel === 'note' ? 'logged' : 'queued',
    contenu: JSON.stringify(
      channel === 'note'
        ? {
            version: ACTIVITY_CONTENT_VERSION,
            note: contenu
          }
        : {
            version: ACTIVITY_CONTENT_VERSION,
            ...(action ? { action } : {}),
            ...(objet ? { objet } : {}),
            corps: contenu
          }
    )
  }
}

export function buildRepaymentAssignmentActivity(
  ref: string,
  user: { login: string; email: string },
  previousEmail: string | null,
  origine?: 'manual',
  comment?: string
): CreateActivityBody | null {
  const email = user.email.trim()
  const login = user.login.trim().toLowerCase()
  if (!email || !login) return null
  const trimmedComment = comment?.trim() ?? ''
  const recipients = [...new Set([login, ...extractMentionsFromText(trimmedComment)])]
  return {
    contexte: 'repayment',
    ref,
    type: 'repayment_assignment',
    statut: 'logged',
    recipients,
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      gestionnaire_precedent: previousEmail,
      gestionnaire: email,
      login,
      ...(origine ? { origine } : {}),
      ...(trimmedComment ? { note: trimmedComment } : {})
    })
  }
}

export type RepaymentAdvancementContext = {
  previousBucket: RepaymentBucketId | null
  id_locataire?: string
}

export type RepaymentAdvancementOperation = {
  kind: 'bucket' | 'note'
  activity: CreateActivityBody
}

export function resolveAdvancementTenant<T extends { id_locataire: string }>(
  rows: T[],
  selected: T | null,
  explicitId?: string
): { id_locataire: string; row: T | null } | null {
  const id_locataire = explicitId ?? selected?.id_locataire
  if (!id_locataire) return null
  const row =
    rows.find((entry) => entry.id_locataire === id_locataire) ??
    (selected?.id_locataire === id_locataire ? selected : null)
  return { id_locataire, row }
}

export function buildRepaymentAdvancementOperations({
  ref,
  bucket,
  comment,
  previousBucket
}: {
  ref: string
  bucket: RepaymentBucketId | null
  comment: string
} & Pick<RepaymentAdvancementContext, 'previousBucket'>): RepaymentAdvancementOperation[] {
  const operations: RepaymentAdvancementOperation[] = []
  const trimmedComment = comment.trim()

  if (bucket != null && bucket !== previousBucket) {
    operations.push({
      kind: 'bucket',
      activity: {
        contexte: 'repayment',
        ref,
        type: 'repayment_phase_change',
        statut: 'logged',
        contenu: JSON.stringify({
          version: ACTIVITY_CONTENT_VERSION,
          phase_precedente: previousBucket,
          phase: bucket,
          ...(trimmedComment ? { note: trimmedComment } : {})
        })
      }
    })
  }

  if (trimmedComment && operations.length === 0) {
    operations.push({
      kind: 'note',
      activity: {
        contexte: 'repayment',
        ref,
        type: 'note',
        statut: 'logged',
        contenu: JSON.stringify({
          version: ACTIVITY_CONTENT_VERSION,
          note: trimmedComment
        })
      }
    })
  }

  return operations
}

export type RepaymentTagChangeOperation = {
  kind: 'tags' | 'note'
  activity: CreateActivityBody
}

export function buildRepaymentTagChangeOperations({
  ref,
  tags,
  previousTags,
  comment
}: {
  ref: string
  tags: readonly string[]
  previousTags: readonly string[]
  comment: string
}): RepaymentTagChangeOperation[] {
  const operations: RepaymentTagChangeOperation[] = []
  const nextTags = canonicalizeRepaymentTags(tags)
  const previous = canonicalizeRepaymentTags(previousTags)
  const trimmedComment = comment.trim()
  const tagsChanged = !sameRepaymentTagSet(nextTags, previous)

  if (tagsChanged) {
    const recipients = [...new Set(extractMentionsFromText(trimmedComment))]
    operations.push({
      kind: 'tags',
      activity: {
        contexte: 'repayment',
        ref,
        type: 'repayment_tag_change',
        statut: 'logged',
        ...(recipients.length > 0 ? { recipients } : {}),
        contenu: JSON.stringify({
          version: ACTIVITY_CONTENT_VERSION,
          tags_precedents: previous,
          tags: nextTags,
          ...(trimmedComment ? { note: trimmedComment } : {})
        })
      }
    })
  } else if (trimmedComment) {
    operations.push({
      kind: 'note',
      activity: {
        contexte: 'repayment',
        ref,
        type: 'note',
        statut: 'logged',
        contenu: JSON.stringify({
          version: ACTIVITY_CONTENT_VERSION,
          note: trimmedComment
        })
      }
    })
  }

  return operations
}

export async function executeRepaymentTagChangeOperations(params: {
  operations: RepaymentTagChangeOperation[]
  createActivity: (activity: CreateActivityBody) => Promise<unknown>
}): Promise<boolean> {
  for (const operation of params.operations) {
    const res = await params.createActivity(operation.activity)
    if (!res) return false
  }
  return true
}

export function buildRepaymentEmailImportActivity(
  ref: string,
  parsed: {
    from: string
    to: string
    subject: string
    body: string
    sentAt: string | null
  }
): CreateActivityBody | null {
  const objet = parsed.subject.trim()
  const corps = parsed.body.trim()
  if (!objet && !corps) return null
  return {
    contexte: 'repayment',
    ref,
    type: 'email_import',
    statut: 'logged',
    ...(parsed.to.trim() ? { destinataire: parsed.to.trim() } : {}),
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      ...(objet ? { objet } : {}),
      corps,
      ...(parsed.from.trim() ? { expediteur: parsed.from.trim() } : {}),
      ...(parsed.to.trim() ? { destinataire: parsed.to.trim() } : {}),
      ...(parsed.sentAt ? { date_envoi: parsed.sentAt } : {})
    })
  }
}

export async function executeRepaymentAdvancementOperations(params: {
  operations: RepaymentAdvancementOperation[]
  createActivity: (activity: CreateActivityBody) => Promise<unknown>
  onBucketStart?: () => void
  onBucketFail?: () => void
  onError?: (err: unknown) => void
}): Promise<{ allSucceeded: boolean; anySucceeded: boolean }> {
  let allSucceeded = true
  let anySucceeded = false

  for (const operation of params.operations) {
    if (operation.kind === 'bucket') params.onBucketStart?.()
    try {
      const res = await params.createActivity(operation.activity)
      if (res) {
        anySucceeded = true
      } else {
        allSucceeded = false
        if (operation.kind === 'bucket') params.onBucketFail?.()
      }
    } catch (err) {
      params.onError?.(err)
      allSucceeded = false
      if (operation.kind === 'bucket') params.onBucketFail?.()
    }
  }

  return { allSucceeded, anySucceeded }
}
