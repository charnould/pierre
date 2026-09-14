import { Database } from 'bun:sqlite'

import {
  type Activite,
  activity_timestamp,
  is_communication_opened_type
} from '../../../shared/activites'
import { get_activity_with_db, insert_activity_row, type ActivityDbRow } from '../activities/rows'
import { CommunicationsError, datastore_path } from './storage'

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
  status === 'sent' || status === 'delivered' || status === 'read' || FAILURE_STATUSES.has(status)

const is_outbound_author = (author: string): boolean =>
  author.startsWith('user:') ||
  author.startsWith('agent:') ||
  author.startsWith('automation:') ||
  author.startsWith('system:')

export type UpdateStatusInput = {
  activity_id: number
  type?: string
  statut: string
  occurred_at: string
}

const latest_thread_event = (db: Database, thread_id: string): ActivityDbRow | null =>
  db
    .query<ActivityDbRow, [string]>(
      `SELECT * FROM activites
       WHERE thread_id = ? AND type LIKE 'communication.%'
       ORDER BY revision DESC LIMIT 1`
    )
    .get(thread_id) ?? null

export const update_status_with_db = (
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

  if (input.statut === 'sent') {
    return {
      activity: existing,
      projected: false,
      transition: { activity: existing, status: 'sent', occurredAt }
    }
  }

  const latest = latest_thread_event(db, existing.thread_id)
  if (latest?.type === 'communication.failed') {
    return { activity: existing, projected: false, transition: null }
  }
  if (latest?.type === 'communication.ok' && input.statut !== 'read') {
    return { activity: existing, projected: false, transition: null }
  }

  const failed = FAILURE_STATUSES.has(input.statut)
  const type = failed ? 'communication.failed' : 'communication.ok'
  const contenu = JSON.stringify({
    version: 2,
    ...(failed
      ? { reason: input.statut }
      : { result: input.statut === 'read' ? 'read' : 'delivered' })
  })
  const idempotency_key = `${existing.thread_id}:${type}:${input.statut}:${occurredAt}`
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
    idempotency_key
  })
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
