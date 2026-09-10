import { Database } from 'bun:sqlite'

import type { ActivityType } from '../../../shared/activites'
import { activity_timestamp } from '../../../shared/activites'
import type { PreviewRow } from '../../../shared/bulk-operations'
import { latest_repayment_states } from '../activities/repayment'
import { insert_activity_row, login_from_email, user_destinataire } from '../activities/rows'

export type BulkVisibleActivityInput = {
  actor: string
  bulkId: string
  executionId: string
  row: PreviewRow
  type: Extract<ActivityType, 'case.group_changed' | 'bulk.applied' | 'bulk.no_route'>
  content: Record<string, unknown>
  idempotencyKey: string
  notifyManager: boolean
}

const current_manager = (db: Database, idLocataire: string): string | null =>
  latest_repayment_states(db, [idLocataire]).get(idLocataire)?.gestionnaire_email ?? null

export const insert_bulk_visible_activity = (
  db: Database,
  input: BulkVisibleActivityInput
): boolean => {
  const manager = input.notifyManager ? current_manager(db, input.row.id_locataire) : null
  const now = activity_timestamp()
  try {
    insert_activity_row(db, {
      date_creation: now,
      rattachement: `repayment:${input.row.id_locataire}`,
      auteur: user_destinataire(input.actor),
      facets: {
        id_client: input.row.id_client,
        id_locataire: input.row.id_locataire,
        id_lot: typeof input.row.values['id_lot'] === 'string' ? input.row.values['id_lot'] : null
      },
      type: input.type,
      mentions: manager ? [{ destinataire: user_destinataire(manager) }] : [],
      contenu:
        input.type === 'case.group_changed'
          ? JSON.stringify({
              version: 2,
              before: input.content['before'] ?? null,
              after: input.content['after'] ?? input.content['bucket'],
              ...(manager ? { note: `Référent notifié : @${login_from_email(manager)}` } : {})
            })
          : JSON.stringify({
              version: 2,
              title:
                typeof input.content['title'] === 'string'
                  ? input.content['title']
                  : typeof input.content['action'] === 'string'
                    ? input.content['action']
                    : 'Traitement de masse',
              values: {
                ...input.content,
                ...(manager ? { referent: `@${login_from_email(manager)}` } : {})
              }
            }),
      bulk_id: input.bulkId,
      execution_id: input.executionId,
      idempotency_key: input.idempotencyKey
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('UNIQUE')) return false
    throw error
  }
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
    type: 'case.group_changed',
    content: {
      title: 'Groupe',
      before: previous,
      after: input.bucketId
    },
    idempotencyKey: `bulk:${input.executionId}:recipient:${input.row.id_locataire}:effect:bucket`
  })
}

const current_manager_state_bucket = (db: Database, idLocataire: string): string =>
  latest_repayment_states(db, [idLocataire]).get(idLocataire)?.bucket ?? 'non_traites'
