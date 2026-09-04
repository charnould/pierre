import { Database } from 'bun:sqlite'

import type { ActivityType } from '../../../shared/activites'
import { activity_timestamp } from '../../../shared/activites'
import type { PreviewRow } from '../../../shared/bulk-operations'
import { latest_repayment_states } from '../activities/repayment'
import { login_from_email, user_destinataire } from '../activities/rows'

export type BulkVisibleActivityInput = {
  actor: string
  bulkId: string
  executionId: string
  row: PreviewRow
  type: Extract<ActivityType, 'case_bucket_change' | 'bulk_application' | 'bulk_no_route'>
  status: 'logged'
  content: Record<string, unknown>
  idempotencyKey: string
  notifyManager: boolean
}

const current_manager = (db: Database, idLocataire: string): string | null =>
  latest_repayment_states(db, [idLocataire]).get(idLocataire)?.gestionnaire_email ?? null

const manager_notification = (manager: string | null): { mentions: string; text?: string } => ({
  mentions: manager
    ? JSON.stringify([{ destinataire: user_destinataire(manager), lu: false, boost: null }])
    : '[]',
  ...(manager ? { text: `Référent notifié : @${login_from_email(manager)}` } : {})
})

export const insert_bulk_visible_activity = (
  db: Database,
  input: BulkVisibleActivityInput
): boolean => {
  const manager = input.notifyManager ? current_manager(db, input.row.id_locataire) : null
  const notification = manager_notification(manager)
  const now = activity_timestamp()
  const result = db.run(
    `INSERT OR IGNORE INTO activites (
       date_creation, date_statut, rattachement, auteur,
       id_client, id_locataire, id_lot, type, statut, mentions, contenu,
       bulk_id, execution_id, idempotency_key
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      now,
      now,
      `repayment:${input.row.id_locataire}`,
      user_destinataire(input.actor),
      input.row.id_client,
      input.row.id_locataire,
      typeof input.row.values['id_lot'] === 'string' ? input.row.values['id_lot'] : null,
      input.type,
      input.status,
      notification.mentions,
      JSON.stringify({
        version: 1,
        ...input.content,
        ...(notification.text ? { referent_notification: notification.text } : {})
      }),
      input.bulkId,
      input.executionId,
      input.idempotencyKey
    ]
  )
  return result.changes > 0
}

export const apply_bucket_effect = (
  db: Database,
  input: {
    actor: string
    bulkId: string
    executionId: string
    row: PreviewRow
    bucketId: string
    notifyManager: boolean
  }
): boolean => {
  const previous = current_manager_state_bucket(db, input.row.id_locataire)
  return insert_bulk_visible_activity(db, {
    ...input,
    type: 'case_bucket_change',
    status: 'logged',
    content: {
      bucket: input.bucketId,
      bucket_precedent: previous
    },
    idempotencyKey: `bulk:${input.executionId}:recipient:${input.row.id_locataire}:effect:bucket`
  })
}

const current_manager_state_bucket = (db: Database, idLocataire: string): string =>
  latest_repayment_states(db, [idLocataire]).get(idLocataire)?.bucket ?? 'non_traites'
