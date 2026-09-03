import { formatTimelineCommunicationPlain } from '@/shared/lib/timeline/timeline-communication'
import type { Activite } from '@/shared/types/activites'
import {
  activity_payload,
  activity_texte,
  parse_case_change_content,
  parse_repayment_plan_content
} from '@/shared/types/activites'

import { typicalMonthlyAmount } from './apurement-plan/installments'
import { formatMoneyDisplay } from './apurement-plan/money'
import type { ApurementPlanFormData } from './apurement-plan/types'
import type { RepaymentBucketId } from './repayment-bucket'
import {
  getRepaymentBucketMeta,
  isRepaymentBucketId,
  resolveRepaymentBucket
} from './repayment-bucket'
import { repaymentPlanSnapshotToForm } from './repayment-plan-persist'
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
  signed: boolean | null
  planValide: boolean
  note: string | null
  resume: string | null
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

export function parseRepaymentStatusChange(row: Activite): RepaymentStatusChangeDisplay | null {
  if (
    (row.type !== 'case.group_changed' && row.type !== 'case.assignee_changed') ||
    !row.rattachement.startsWith('repayment:')
  ) {
    return null
  }

  if (row.type === 'case.group_changed') {
    const change = parse_case_change_content(row.contenu)
    const apresRaw = typeof change?.after === 'string' ? change.after : null
    if (typeof apresRaw !== 'string' || !isRepaymentBucketId(apresRaw)) return null
    const avantRaw = change?.before
    const avant =
      typeof avantRaw === 'string' && isRepaymentBucketId(avantRaw)
        ? avantRaw
        : resolveRepaymentBucket(typeof avantRaw === 'string' ? avantRaw : undefined)
    return { champ: 'bucket', avant, apres: apresRaw, avantUnset: false }
  }

  const change = parse_case_change_content(row.contenu)
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
    { type: 'text', text: 'a déplacé le dossier du groupe' },
    { type: 'bucket', id: change.avant },
    { type: 'text', text: 'vers' },
    { type: 'bucket', id: change.apres }
  ]
}

export function parseRepaymentStatusChangeComment(row: Activite): string | null {
  if (parseRepaymentStatusChange(row) == null) return null
  const payload = activity_payload(row.type, row.contenu)
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

export function formatRepaymentStatusChangeText(row: Activite): string | null {
  const change = parseRepaymentStatusChange(row)
  if (!change) return null

  const avant = change.avantUnset
    ? 'Non renseigné'
    : formatStatusChangeValue(change.champ, change.avant)
  const apres = formatStatusChangeValue(change.champ, change.apres)
  return `${quote(avant)} → ${quote(apres)}`
}

function repaymentPlanSigned(row: Activite): boolean {
  if (row.type === 'repayment_plan.finalized') return true
  if (row.type !== 'repayment_plan.closed') return false
  const content = parse_repayment_plan_content(row.type, row.contenu)
  return content != null && 'reason' in content && content.reason !== 'withdrawn'
}

/** Newest `repayment_plan` that still carries an editable form, or null. */
export function latestEditableRepaymentPlan(rows: Activite[]): Activite | null {
  let latest: Activite | null = null
  for (const row of rows) {
    if (!parseRepaymentPlanForm(row)) continue
    if (latest == null || row.id > latest.id) {
      latest = row
    }
  }
  return latest
}

export type ActiveRepaymentPlan = {
  row: Activite
  signed: boolean
}

/** Latest plan that is not closed. `null` → the pile verb is « Créer ». */
export function latestActiveRepaymentPlan(rows: Activite[]): ActiveRepaymentPlan | null {
  const latest = latestEditableRepaymentPlan(rows)
  if (!latest) return null
  if (latest.type === 'repayment_plan.closed') return null
  return { row: latest, signed: parseRepaymentPlanProposal(latest)?.signed === true }
}

/** Full editable form restored from the current plan snapshot, or null on a light milestone. */
export function parseRepaymentPlanForm(row: Activite): ApurementPlanFormData | null {
  if (!row.type.startsWith('repayment_plan.')) return null
  const content = parse_repayment_plan_content(row.type, row.contenu)
  return content?.plan ? repaymentPlanSnapshotToForm(content.plan, repaymentPlanSigned(row)) : null
}

export function parseRepaymentPlanProposal(row: Activite): RepaymentPlanProposalDisplay | null {
  if (!row.type.startsWith('repayment_plan.')) return null

  const content = parse_repayment_plan_content(row.type, row.contenu)
  if (!content) return null
  const signed = repaymentPlanSigned(row)
  let resume: string | null = null
  if (content.plan?.installments.length) {
    const installments = content.plan.installments.map((installment, index) => ({
      id: String(index),
      yearMonth: installment.year_month,
      amount: installment.amount
    }))
    resume = `${formatMoneyDisplay(typicalMonthlyAmount(installments))} × ${installments.length} mois`
  }

  return {
    titre: content.title,
    signed,
    planValide: signed,
    note: content.note ?? null,
    resume
  }
}

export function formatRepaymentActivityBody(row: Activite): string {
  const bulkPayload = activity_payload(row.type, row.contenu)
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

  const tagChange = row.type === 'case.tags_changed' ? parse_case_change_content(row.contenu) : null
  if (tagChange && Array.isArray(tagChange.after)) {
    const tags = canonicalizeRepaymentTags(
      tagChange.after.map((entry) => (typeof entry === 'string' ? entry : entry.label))
    )
    const snapshot = tags.length > 0 ? tags.join(' · ') : 'Aucun tag'
    return tagChange.note ? `${snapshot}\n${tagChange.note}` : snapshot
  }

  const plan = parseRepaymentPlanProposal(row)
  if (plan) {
    return [plan.titre, plan.resume, plan.note].filter(Boolean).join('\n')
  }

  const message = formatTimelineCommunicationPlain(row)
  if (message) return message

  const text = activity_texte(row.type, row.contenu)
  if (text) return text
  const payload = activity_payload(row.type, row.contenu)
  if (typeof payload['titre'] === 'string') return payload['titre']
  return row.type
}
