import { Database } from 'bun:sqlite'

import {
  ACTIVITY_CONTENT_VERSION,
  parse_communication_opened_content,
  type Activite
} from '../../../shared/activites'
import { get_activity_with_db, parse_rattachement } from '../activities/rows'
import { arm_bulk_scheduler } from '../bulk/scheduler/queue'
import { mark_sms_compatible } from '../contacts'
import { update_status_with_db } from '../delivery-status'
import { communication_reference } from './parsing'
import { CommunicationsError, create_outbound_with_db, datastore_path } from './storage'

const sms_fallback_key = (rcsActivity: Activite): string => `fallback:rcs:${rcsActivity.id}:sms`

const find_sms_fallback_with_db = (db: Database, rcsActivity: Activite): Activite | null => {
  const existing = db
    .query<{ id: number }, [string]>('SELECT id FROM activites WHERE idempotency_key = ? LIMIT 1')
    .get(sms_fallback_key(rcsActivity))
  return existing ? get_activity_with_db(db, existing.id) : null
}

const create_sms_fallback_with_db = (db: Database, rcsActivity: Activite): Activite | null => {
  if (
    rcsActivity.channel !== 'rcs' ||
    rcsActivity.bulk_id ||
    !rcsActivity.destinataire ||
    !rcsActivity.thread_id ||
    !rcsActivity.auteur.startsWith('user:')
  ) {
    return null
  }

  const attachment = parse_rattachement(rcsActivity.rattachement)
  const content = parse_communication_opened_content(rcsActivity.contenu)
  if (!attachment || !content) return null
  const sms_body = content.sms_fallback ?? content.body
  if (!sms_body) return null
  const existing = find_sms_fallback_with_db(db, rcsActivity)
  if (existing) return existing

  mark_sms_compatible(db, rcsActivity.destinataire)
  return create_outbound_with_db(db, {
    actor: rcsActivity.auteur.slice('user:'.length),
    contexte: attachment.contexte,
    ref: attachment.ref,
    type: 'sms',
    destinataire: rcsActivity.destinataire,
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      body: sms_body,
      ...(content.action ? { action: content.action } : {}),
      fallback_from: communication_reference(rcsActivity.id)
    }),
    idempotency_key: sms_fallback_key(rcsActivity),
    thread_id: rcsActivity.thread_id
  })
}

export const settle_definitive_rcs_failure = (
  activity_id: number,
  occurred_at: string
): { activity: Activite; smsFallback: Activite | null } => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  let result: ReturnType<typeof update_status_with_db>
  let smsFallback: Activite | null = null
  try {
    db.run('BEGIN IMMEDIATE')
    const source = get_activity_with_db(db, activity_id)
    if (!source) {
      throw new CommunicationsError('Communication introuvable', 'not_found')
    }
    if (source.channel !== 'rcs') {
      throw new CommunicationsError('La communication n’est pas un RCS', 'invalid_body')
    }
    result = update_status_with_db(db, {
      activity_id,
      type: 'rcs',
      statut: 'failed',
      occurred_at
    })
    smsFallback = result.projected
      ? create_sms_fallback_with_db(db, source)
      : find_sms_fallback_with_db(db, source)
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
  if (result!.fallbackScheduled) queueMicrotask(arm_bulk_scheduler)
  return { activity: result!.activity, smsFallback }
}
