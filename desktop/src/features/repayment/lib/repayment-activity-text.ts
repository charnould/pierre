import type { Activite } from '@/shared/types/activites'
import { activity_payload, parse_case_tag_change_content } from '@/shared/types/activites'

import { formatMoneyDisplay } from './apurement-plan/money'
import type { ApurementPlanFormData } from './apurement-plan/types'
import type { RepaymentBucketId } from './repayment-bucket'
import {
  getRepaymentBucketMeta,
  isRepaymentBucketId,
  resolveRepaymentBucket
} from './repayment-bucket'
import { formatTimelineMessageBodyPlain } from './repayment-outbound-message'
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
    (row.type !== 'case_bucket_change' && row.type !== 'case_assignment') ||
    !row.rattachement.startsWith('repayment:')
  ) {
    return null
  }

  const payload = activity_payload(row.type, row.contenu)
  if (row.type === 'case_bucket_change') {
    const apresRaw = payload['bucket']
    if (typeof apresRaw !== 'string' || !isRepaymentBucketId(apresRaw)) return null
    const avantRaw = payload['bucket_precedent']
    const avant =
      typeof avantRaw === 'string' && isRepaymentBucketId(avantRaw)
        ? avantRaw
        : resolveRepaymentBucket(typeof avantRaw === 'string' ? avantRaw : undefined)
    return { champ: 'bucket', avant, apres: apresRaw, avantUnset: false }
  }

  const apresRaw = payload['referent']
  if (typeof apresRaw === 'string' && apresRaw.trim() !== '') {
    const avantRaw = payload['referent_precedent']
    const avantUnset = avantRaw == null || avantRaw === ''
    const avant =
      !avantUnset && typeof avantRaw === 'string' && avantRaw.trim() !== '' ? avantRaw.trim() : null
    const email = apresRaw.includes('@') ? apresRaw.trim().toLowerCase() : null
    return {
      champ: 'gestionnaire',
      avant,
      apres: apresRaw.trim(),
      login: email
        ? email.slice(0, email.indexOf('@') === -1 ? email.length : email.indexOf('@'))
        : null,
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

function isApurementPlanFormData(value: unknown): value is ApurementPlanFormData {
  if (!value || typeof value !== 'object') return false
  const form = value as ApurementPlanFormData
  return (
    typeof form.rentalDebt === 'number' &&
    typeof form.signed === 'boolean' &&
    typeof form.planType === 'string' &&
    typeof form.address === 'string' &&
    Array.isArray(form.installments) &&
    form.household != null &&
    typeof form.household === 'object' &&
    Array.isArray(form.household.adults) &&
    Array.isArray(form.household.children) &&
    Array.isArray(form.income) &&
    Array.isArray(form.expenses) &&
    Array.isArray(form.requestedAids)
  )
}

function normalizePlanFormIds(form: ApurementPlanFormData): ApurementPlanFormData {
  return {
    ...form,
    idLocataire: typeof form.idLocataire === 'string' ? form.idLocataire : '',
    idClient: typeof form.idClient === 'string' ? form.idClient : ''
  }
}

/** Newest `repayment_plan` that still carries an editable form, or null. */
export function latestEditableRepaymentPlan(rows: Activite[]): Activite | null {
  let latest: Activite | null = null
  for (const row of rows) {
    if (!parseRepaymentPlanForm(row)) continue
    if (
      latest == null ||
      row.date_creation.localeCompare(latest.date_creation) > 0 ||
      (row.date_creation === latest.date_creation && row.id > latest.id)
    ) {
      latest = row
    }
  }
  return latest
}

export type ActiveRepaymentPlan = {
  row: Activite
  signed: boolean
}

function closedPlanActivityIds(rows: Activite[]): Set<number> {
  const ids = new Set<number>()
  for (const row of rows) {
    if (row.type !== 'repayment_plan_close') continue
    const payload = activity_payload(row.type, row.contenu)
    const planId = payload['id_activite_plan']
    if (typeof planId === 'number') ids.add(planId)
  }
  return ids
}

/** Latest plan that is not closed. `null` → the pile verb is « Créer ». */
export function latestActiveRepaymentPlan(rows: Activite[]): ActiveRepaymentPlan | null {
  const latest = latestEditableRepaymentPlan(rows)
  if (!latest) return null
  if (closedPlanActivityIds(rows).has(latest.id)) return null
  return { row: latest, signed: parseRepaymentPlanProposal(latest)?.signed === true }
}

/** Full editable form stored under `contenu.formulaire`, or null if missing/invalid. */
export function parseRepaymentPlanForm(row: Activite): ApurementPlanFormData | null {
  if (row.type !== 'repayment_plan') return null
  const payload = activity_payload(row.type, row.contenu)
  const form = payload['formulaire']
  if (!isApurementPlanFormData(form)) return null
  return normalizePlanFormIds(form)
}

export function parseRepaymentPlanProposal(row: Activite): RepaymentPlanProposalDisplay | null {
  if (row.type !== 'repayment_plan') return null

  const payload = activity_payload(row.type, row.contenu)
  const titre =
    typeof payload['titre'] === 'string' && payload['titre'].trim()
      ? payload['titre'].trim()
      : "Plan d'apurement"
  const planValide = payload['etat'] === 'signe'
  const note =
    typeof payload['note'] === 'string' && payload['note'].trim() ? payload['note'].trim() : null

  const resumeRaw = payload['resume']
  let resume: string | null = null
  const signed = payload['etat'] === 'signe'
  if (resumeRaw && typeof resumeRaw === 'object' && !Array.isArray(resumeRaw)) {
    const values = resumeRaw as Record<string, unknown>
    const monthlyAmount = Number(values['mensualite'])
    const durationMonths = Number(values['nombre_echeances'])
    const monthly = formatMoneyDisplay(Number.isFinite(monthlyAmount) ? monthlyAmount : 0)
    resume = durationMonths ? `${monthly} × ${durationMonths} mois` : monthly
  }

  return {
    titre,
    signed,
    planValide,
    note,
    resume
  }
}

export function formatRepaymentActivityBody(row: Activite): string {
  const bulkPayload = activity_payload(row.type, row.contenu)
  if (row.type === 'bulk_application') {
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
  if (row.type === 'bulk_no_route') {
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

  const tagChange =
    row.type === 'case_tag_change' ? parse_case_tag_change_content(row.contenu) : null
  if (tagChange) {
    const tags = canonicalizeRepaymentTags(tagChange.tags)
    const snapshot = tags.length > 0 ? tags.join(' · ') : 'Aucun tag'
    return tagChange.note ? `${snapshot}\n${tagChange.note}` : snapshot
  }

  const plan = parseRepaymentPlanProposal(row)
  if (plan) {
    return [plan.titre, plan.resume, plan.note].filter(Boolean).join('\n')
  }

  const message = formatTimelineMessageBodyPlain(row)
  if (message) return message

  const payload = activity_payload(row.type, row.contenu)
  if (typeof payload['contenu'] === 'string') return payload['contenu']
  if (typeof payload['titre'] === 'string') return payload['titre']
  return row.type
}
