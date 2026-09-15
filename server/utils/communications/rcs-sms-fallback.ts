import type { Database } from 'bun:sqlite'

import {
  ACTIVITY_CONTENT_VERSION,
  parse_communication_opened_content,
  type Activite
} from '../../../shared/activites'
import { parse_rattachement } from '../activities/rows'
import { communication_reference, next_status_timestamp } from './parsing'
import { project_communication_status_with_db } from './status'
import { create_outbound_with_db } from './storage'

const FALLBACK_REASON = 'provider_not_configured'

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

  const sms = create_outbound_with_db(db, {
    actor: rcsActivity.auteur.slice('user:'.length),
    contexte: attachment.contexte,
    ref: attachment.ref,
    type: 'sms',
    destinataire: rcsActivity.destinataire,
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      body: content.body,
      ...(content.action ? { action: content.action } : {}),
      fallback_from: communication_reference(rcsActivity.id)
    }),
    idempotency_key: `fallback:rcs:${rcsActivity.id}:sms`
  })

  project_communication_status_with_db(db, {
    activity_id: sms.id,
    type: 'sms',
    statut: 'failed',
    reason: FALLBACK_REASON,
    occurred_at: next_status_timestamp(sms)
  })

  return sms
}
