import { formatTimelineCommunicationPlain } from '@/shared/lib/timeline/timeline-communication'
import type { Activity } from '@/shared/types/activites'
import {
  activityPayload,
  activityText,
  parseCaseChangeContent,
  parseRepaymentPlanContent
} from '@/shared/types/activites'

import type { RepaymentForms } from '../../../../../shared/repayment-plan'
import type { RepaymentBucketId } from './repayment-bucket'
import {
  getRepaymentBucketMeta,
  isRepaymentBucketId,
  resolveRepaymentBucket
} from './repayment-bucket'
import { canonicalizeRepaymentTags } from './repayment-tags'

export type RepaymentStatusChangeDisplay =
  | {
      champ: 'bucket'
      avant: RepaymentBucketId
      apres: RepaymentBucketId
      avantUnset: false
    }
  | {
      champ: 'gestionnaire'
      avant: string | null
      apres: string
      login: string | null
      avantUnset: boolean
    }

export type RepaymentPlanProposalDisplay = {
  titre: string
}

function formatStatusChangeValue(champ: string, value: unknown): string {
  if (value == null || value === '') {
    if (champ === 'gestionnaire') return 'Non renseigné'
    return getRepaymentBucketMeta(resolveRepaymentBucket(undefined)).label
  }
  if (typeof value !== 'string') return String(value)

  if (champ === 'bucket' && isRepaymentBucketId(value)) {
    return getRepaymentBucketMeta(value).label
  }
  return value
}

export function parseRepaymentStatusChange(row: Activity): RepaymentStatusChangeDisplay | null {
  if (
    (row.type !== 'case.group_changed' && row.type !== 'case.assignee_changed') ||
    !row.rattachement.startsWith('repayment:')
  ) {
    return null
  }

  if (row.type === 'case.group_changed') {
    const change = parseCaseChangeContent(row.contenu)
    const apresRaw = typeof change?.after === 'string' ? change.after : null
    if (typeof apresRaw !== 'string' || !isRepaymentBucketId(apresRaw)) return null
    const avantRaw = change?.before
    const avant =
      typeof avantRaw === 'string' && isRepaymentBucketId(avantRaw)
        ? avantRaw
        : resolveRepaymentBucket(typeof avantRaw === 'string' ? avantRaw : undefined)
    return { champ: 'bucket', avant, apres: apresRaw, avantUnset: false }
  }

  const change = parseCaseChangeContent(row.contenu)
  const apresRaw =
    change?.after && typeof change.after === 'object' && !Array.isArray(change.after)
      ? change.after
      : null
  if (apresRaw) {
    const avantRaw =
      change?.before && typeof change.before === 'object' && !Array.isArray(change.before)
        ? change.before.id
        : null
    const avantUnset = avantRaw == null || avantRaw === ''
    const avant = !avantUnset ? avantRaw.trim() : null
    const email = apresRaw.id.trim().toLowerCase()
    return {
      champ: 'gestionnaire',
      avant,
      apres: email,
      login: apresRaw.label.trim() || loginFromIdentity(email),
      avantUnset
    }
  }

  return null
}

function loginFromIdentity(raw: string): string {
  const trimmed = raw.trim()
  const at = trimmed.indexOf('@')
  return at > 0 ? trimmed.slice(0, at) : trimmed
}

function capitalizeLogin(raw: string): string {
  const login = loginFromIdentity(raw)
  if (!login) return raw
  return login.charAt(0).toUpperCase() + login.slice(1)
}

export type StatusChangeSentencePart =
  | { type: 'text'; text: string }
  | { type: 'person'; identity: string }
  | { type: 'bucket'; id: RepaymentBucketId }

export function statusChangeTimelineSentence(
  change: RepaymentStatusChangeDisplay
): StatusChangeSentencePart[] {
  if (change.champ === 'gestionnaire') {
    const apres = change.login || loginFromIdentity(change.apres)
    if (change.avantUnset || change.avant == null) {
      return [
        { type: 'text', text: 'a affecté le dossier à' },
        { type: 'person', identity: apres }
      ]
    }
    return [
      { type: 'text', text: 'a réaffecté le dossier de' },
      { type: 'person', identity: loginFromIdentity(change.avant) },
      { type: 'text', text: 'à' },
      { type: 'person', identity: apres }
    ]
  }
  return [
    { type: 'text', text: 'a changé la phase de' },
    { type: 'bucket', id: change.avant },
    { type: 'text', text: 'vers' },
    { type: 'bucket', id: change.apres }
  ]
}

export function parseRepaymentStatusChangeComment(row: Activity): string | null {
  if (parseRepaymentStatusChange(row) == null) return null
  const payload = activityPayload(row.type, row.contenu)
  const comment = payload['note']
  if (typeof comment !== 'string') return null
  const trimmed = comment.trim()
  return trimmed || null
}

export function formatStatusChangeTimelineSentence(change: RepaymentStatusChangeDisplay): string {
  return statusChangeTimelineSentence(change)
    .map((part) => {
      if (part.type === 'text') return part.text
      if (part.type === 'person') return capitalizeLogin(part.identity)
      return getRepaymentBucketMeta(part.id).label
    })
    .join(' ')
}

/** Les labels de `customization` peuvent déjà porter des guillemets : ne pas les doubler. */
function quote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.includes('«') || trimmed.includes('»')) return trimmed
  return `« ${trimmed} »`
}

export function formatRepaymentStatusChangeText(row: Activity): string | null {
  const change = parseRepaymentStatusChange(row)
  if (!change) return null

  const avant = change.avantUnset
    ? 'Non renseigné'
    : formatStatusChangeValue(change.champ, change.avant)
  const apres = formatStatusChangeValue(change.champ, change.apres)
  return `${quote(avant)} → ${quote(apres)}`
}

/** Newest repayment plan that still carries a dossier, or null. */
export function latestEditableRepaymentPlan(rows: Activity[]): Activity | null {
  let latest: Activity | null = null
  for (const row of rows) {
    if (!parseRepaymentPlanForm(row)) continue
    if (latest == null || row.id > latest.id) latest = row
  }
  return latest
}

export type ActiveRepaymentPlan = {
  row: Activity
}

/** Latest dossier. `null` → the pile verb is « Créer ». */
export function latestActiveRepaymentPlan(rows: Activity[]): ActiveRepaymentPlan | null {
  const latest = latestEditableRepaymentPlan(rows)
  if (!latest) return null
  return { row: latest }
}

/** Dossier restored from the activity, or null when the row does not carry one. */
export function parseRepaymentPlanForm(row: Activity): RepaymentForms | null {
  if (!row.type.startsWith('repayment_plan.')) return null
  const content = parseRepaymentPlanContent(row.type, row.contenu)
  return content
}

export function parseRepaymentPlanProposal(row: Activity): RepaymentPlanProposalDisplay | null {
  if (!parseRepaymentPlanForm(row)) return null
  return { titre: 'Plan d’apurement' }
}

export function formatRepaymentActivityBody(row: Activity): string {
  const bulkPayload = activityPayload(row.type, row.contenu)
  if (row.type === 'bulk.applied') {
    const action =
      typeof bulkPayload['action'] === 'string' ? bulkPayload['action'] : 'Action de masse'
    const phase =
      typeof bulkPayload['phase'] === 'string' && isRepaymentBucketId(bulkPayload['phase'])
        ? getRepaymentBucketMeta(bulkPayload['phase']).label
        : null
    return [
      `L’action « ${action} » a été appliquée sans envoi.`,
      phase ? `Le dossier a été déplacé vers « ${phase} ».` : null,
      typeof bulkPayload['referent_notification'] === 'string'
        ? bulkPayload['referent_notification']
        : null
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (row.type === 'bulk.no_route') {
    return [
      'Aucun envoi n’a pu être tenté.',
      typeof bulkPayload['referent_notification'] === 'string'
        ? bulkPayload['referent_notification']
        : null
    ]
      .filter(Boolean)
      .join(' ')
  }
  const statusChange = formatRepaymentStatusChangeText(row)
  if (statusChange) return statusChange

  const tagChange = row.type === 'case.tags_changed' ? parseCaseChangeContent(row.contenu) : null
  if (tagChange && Array.isArray(tagChange.after)) {
    const tags = canonicalizeRepaymentTags(
      tagChange.after.map((entry) => (typeof entry === 'string' ? entry : entry.label))
    )
    const snapshot = tags.length > 0 ? tags.join(' · ') : 'Aucun tag'
    return tagChange.note ? `${snapshot}\n${tagChange.note}` : snapshot
  }

  const plan = parseRepaymentPlanProposal(row)
  if (plan) return plan.titre

  const message = formatTimelineCommunicationPlain(row)
  if (message) return message

  const text = activityText(row.type, row.contenu)
  if (text) return text
  const payload = activityPayload(row.type, row.contenu)
  if (typeof payload['titre'] === 'string') return payload['titre']
  return row.type
}
