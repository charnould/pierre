import type { Database } from 'bun:sqlite'

import {
  ACTIVITY_CONTENT_VERSION,
  parse_communication_opened_content,
  type Activite
} from '../../../shared/activites'
import { parse_rattachement } from '../activities/rows'
import { mark_sms_compatible } from '../contacts'
import { communication_reference } from './parsing'
import { create_outbound_with_db } from './storage'

export function create_sms_fallback_with_db(db: Database, rcsActivity: Activite): Activite | null {
  if (
    rcsActivity.channel !== 'rcs' ||
    rcsActivity.bulk_id ||
    !rcsActivity.destinataire ||
    !rcsActivity.auteur.startsWith('user:')
  ) {
    return null
  }

  const attachment = parse_rattachement(rcsActivity.rattachement)
  const content = parse_communication_opened_content(rcsActivity.contenu)
  if (!attachment || !content) return null
  const sms_body = content.sms_fallback ?? content.body
  if (!sms_body) return null
  mark_sms_compatible(db, rcsActivity.destinataire)
  const idempotency_key = `fallback:rcs:${rcsActivity.id}:sms`
  const existing = db
    .query<{ id: number }, [string]>('SELECT id FROM activites WHERE idempotency_key = ? LIMIT 1')
    .get(idempotency_key)
  if (existing) return null

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
    idempotency_key
  })
}
