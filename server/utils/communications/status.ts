import { Database } from 'bun:sqlite'

import {
  type Activite,
  type ActivityStatus,
  type CommunicationType
} from '../../../shared/activites'
import { get_activity_with_db } from '../activities/rows'
import { CommunicationsError, datastore_path } from './storage'

const STATUS_BY_TYPE: Record<CommunicationType, readonly ActivityStatus[]> = {
  rcs: ['queued', 'sent', 'delivered', 'read', 'failed'],
  sms: ['queued', 'sent', 'delivered', 'failed'],
  email: ['queued', 'sent', 'delivered', 'read', 'failed'],
  courrier: ['queued', 'sent', 'delivered', 'returned', 'failed'],
  lrar: ['queued', 'sent', 'delivered', 'returned', 'refused', 'failed'],
  lre: ['queued', 'sent', 'delivered', 'read', 'refused', 'expired', 'failed'],
  signature: ['queued', 'sent', 'signed', 'refused', 'expired', 'failed']
}

export const is_communication_status = (
  type: CommunicationType,
  status: string
): status is ActivityStatus => STATUS_BY_TYPE[type].includes(status as ActivityStatus)

const FAILURE_STATUSES = new Set<ActivityStatus>([
  'failed',
  'undelivered',
  'expired',
  'rejected',
  'bounced',
  'returned',
  'refused',
  'unclaimed'
])
const is_outbound_author = (author: string): boolean =>
  author.startsWith('user:') ||
  author.startsWith('agent:') ||
  author.startsWith('automation:') ||
  author.startsWith('system:')
export type UpdateStatusInput = {
  activity_id: number
  type: CommunicationType
  statut: ActivityStatus
  occurred_at: string
}

const success_rank = (status: ActivityStatus | null): number =>
  status === 'queued'
    ? 0
    : status === 'sent'
      ? 1
      : status === 'delivered'
        ? 2
        : status === 'read' || status === 'signed'
          ? 3
          : -1

export const update_status_with_db = (
  db: Database,
  input: UpdateStatusInput
): {
  activity: Activite
  projected: boolean
  transition: { activity: Activite; status: ActivityStatus; occurredAt: string } | null
} => {
  if (!is_communication_status(input.type, input.statut)) {
    throw new CommunicationsError('Statut invalide pour ce medium', 'invalid_status')
  }
  const occurred = new Date(input.occurred_at)
  if (Number.isNaN(occurred.getTime())) {
    throw new CommunicationsError('occurredAt invalide')
  }
  const occurredAt = occurred.toISOString()
  const existing = get_activity_with_db(db, input.activity_id)
  if (!existing) throw new CommunicationsError('Communication introuvable', 'not_found')
  if (existing.type !== input.type) {
    throw new CommunicationsError('Le medium ne correspond pas', 'invalid_body')
  }
  if (!is_outbound_author(existing.auteur)) {
    throw new CommunicationsError('Une communication entrante est immuable', 'forbidden')
  }

  let content: Record<string, unknown> = {}
  try {
    content = JSON.parse(existing.contenu) as Record<string, unknown>
  } catch {
    content = {}
  }
  const delivery =
    content['delivery'] && typeof content['delivery'] === 'object'
      ? (content['delivery'] as Record<string, unknown>)
      : {}
  const history = Array.isArray(delivery['history'])
    ? (delivery['history'] as Array<Record<string, unknown>>)
    : []
  const duplicate = history.some(
    (event) => event['status'] === input.statut && event['occurred_at'] === occurredAt
  )
  if (duplicate) {
    return { activity: existing, projected: false, transition: null }
  }
  const nextHistory = [...history, { status: input.statut, occurred_at: occurredAt }].sort(
    (left, right) =>
      String(left['occurred_at'] ?? '').localeCompare(String(right['occurred_at'] ?? ''))
  )
  const nextContent = JSON.stringify({
    ...content,
    delivery: {
      ...delivery,
      history: nextHistory
    }
  })
  const currentTime = new Date(existing.date_statut ?? existing.date_creation).getTime()
  const older = currentTime >= occurred.getTime()
  const regressesSuccess =
    success_rank(existing.statut) >= 0 &&
    success_rank(input.statut) >= 0 &&
    success_rank(input.statut) < success_rank(existing.statut)
  const settled = existing.statut != null && FAILURE_STATUSES.has(existing.statut)
  if (older || regressesSuccess || settled) {
    db.run('UPDATE activites SET contenu = ? WHERE id = ?', [nextContent, input.activity_id])
    return {
      activity: get_activity_with_db(db, input.activity_id)!,
      projected: false,
      transition: null
    }
  }

  db.run('UPDATE activites SET statut = ?, date_statut = ?, contenu = ? WHERE id = ?', [
    input.statut,
    occurredAt,
    nextContent,
    input.activity_id
  ])
  const activity = get_activity_with_db(db, input.activity_id)!
  return {
    activity,
    projected: true,
    transition: { activity, status: input.statut, occurredAt }
  }
}

export const update_status = (input: UpdateStatusInput): Activite => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  let result: ReturnType<typeof update_status_with_db>
  try {
    db.run('BEGIN IMMEDIATE')
    result = update_status_with_db(db, input)
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
  return result!.activity
}
