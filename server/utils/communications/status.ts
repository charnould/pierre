import type { Database } from 'bun:sqlite'

import {
  type Activite,
  activity_timestamp,
  is_communication_opened_type,
  parse_communication_status_content
} from '../../../shared/activites'
import { get_activity_with_db, insert_activity_row, type ActivityDbRow } from '../activities/rows'
import { CommunicationsError } from './storage'

const FAILURE_STATUSES = new Set([
  'failed',
  'undelivered',
  'expired',
  'rejected',
  'bounced',
  'returned',
  'refused',
  'unclaimed'
])

export const is_communication_status = (_medium: string, status: string): boolean =>
  status === 'sent' ||
  status === 'delivered' ||
  status === 'read' ||
  status === 'opened' ||
  FAILURE_STATUSES.has(status)

const is_outbound_author = (author: string): boolean =>
  author.startsWith('user:') ||
  author.startsWith('agent:') ||
  author.startsWith('automation:') ||
  author.startsWith('system:')

export type UpdateStatusInput = {
  activity_id: number
  type?: string
  statut: string
  reason?: string
  occurred_at: string
  idempotency_key?: string
  id_externe?: string
}

const next_sent_revision = (db: Database, thread_id: string, revision: number): number | null =>
  db
    .query<{ revision: number }, [string, number]>(
      `SELECT revision FROM activites
       WHERE thread_id = ? AND type = 'communication.sent' AND revision > ?
       ORDER BY revision LIMIT 1`
    )
    .get(thread_id, revision)?.revision ?? null

const latest_attempt_event = (
  db: Database,
  thread_id: string,
  revision: number
): ActivityDbRow | null =>
  db
    .query<ActivityDbRow, [string, number]>(
      `SELECT * FROM activites
       WHERE thread_id = ? AND revision >= ? AND type LIKE 'communication.%'
       ORDER BY revision DESC LIMIT 1`
    )
    .get(thread_id, revision) ?? null

export const project_communication_status_with_db = (
  db: Database,
  input: UpdateStatusInput
): {
  activity: Activite
  projected: boolean
  transition: { activity: Activite; status: string; occurredAt: string } | null
} => {
  const occurred = new Date(input.occurred_at)
  if (Number.isNaN(occurred.getTime())) {
    throw new CommunicationsError('occurredAt invalide')
  }
  const occurredAt = activity_timestamp(occurred)
  const existing = get_activity_with_db(db, input.activity_id)
  if (!existing) throw new CommunicationsError('Communication introuvable', 'not_found')
  if (!is_communication_opened_type(existing.type) || !existing.thread_id || !existing.channel) {
    throw new CommunicationsError('Le medium ne correspond pas', 'invalid_body')
  }
  if (!is_outbound_author(existing.auteur)) {
    throw new CommunicationsError('Une communication entrante est immuable', 'forbidden')
  }

  const sourceRevision = existing.revision ?? 1
  if (next_sent_revision(db, existing.thread_id, sourceRevision) != null) {
    return { activity: existing, projected: false, transition: null }
  }
  const latest = latest_attempt_event(db, existing.thread_id, sourceRevision)
  if (latest?.type === 'communication.failed') {
    return { activity: existing, projected: false, transition: null }
  }
  const latestResult =
    latest?.type === 'communication.ok'
      ? parse_communication_status_content(latest.contenu)?.result
      : undefined
  const followsDelivery = input.statut === 'read' || input.statut === 'opened'
  const emailFailedAfterDelivery = existing.channel === 'email' && input.statut === 'failed'
  if (latestResult) {
    if (input.statut === 'sent') {
      return { activity: existing, projected: false, transition: null }
    } else if (latestResult !== 'sent' && !followsDelivery && !emailFailedAfterDelivery) {
      return { activity: existing, projected: false, transition: null }
    }
  }

  const failed = FAILURE_STATUSES.has(input.statut)
  const type = failed ? 'communication.failed' : 'communication.ok'
  const contenu = JSON.stringify({
    version: 2,
    ...(failed
      ? { reason: input.reason?.trim() || input.statut }
      : {
          result:
            input.statut === 'sent'
              ? 'sent'
              : input.statut === 'read'
                ? 'read'
                : input.statut === 'opened'
                  ? 'opened'
                  : 'delivered'
        })
  })
  const idempotency_key =
    input.idempotency_key ?? `${existing.id}:${type}:${input.statut}:${occurredAt}`
  const duplicate = db
    .query<{ id: number }, [string]>('SELECT id FROM activites WHERE idempotency_key = ? LIMIT 1')
    .get(idempotency_key)
  if (duplicate) {
    return { activity: existing, projected: false, transition: null }
  }

  const activity = insert_activity_row(db, {
    date_creation: occurredAt,
    rattachement: existing.rattachement,
    auteur: existing.auteur,
    destinataire: existing.destinataire,
    facets: {
      id_client: existing.id_client,
      id_locataire: existing.id_locataire,
      id_lot: existing.id_lot
    },
    type,
    channel: existing.channel,
    mentions: [],
    contenu,
    thread_id: existing.thread_id,
    revision: (latest?.revision ?? existing.revision ?? 1) + 1,
    bulk_id: existing.bulk_id,
    execution_id: existing.execution_id,
    idempotency_key,
    id_externe: input.id_externe ?? null
  })
  return {
    activity,
    projected: true,
    transition: { activity, status: input.statut, occurredAt }
  }
}
