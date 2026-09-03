import { Database } from 'bun:sqlite'

import type { Activite, ActivityStatus, CommunicationType } from '../../../shared/activites'
import {
  type UpdateStatusInput,
  update_status_with_db as update_communication_status_with_db
} from '../communications/status'
import { datastore_path } from '../communications/storage'
import {
  apply_sent_bucket_effect_with_db,
  schedule_bulk_fallback_with_db,
  settle_bulk_item_for_status_with_db
} from './jobs'
import { handle_rich_rcs_status_with_db } from './rich-rcs'
import { arm_bulk_scheduler } from './scheduler/queue'

let transitionHook: (() => void) | null = null

export const set_bulk_status_hook_for_tests = (hook: (() => void) | null): void => {
  transitionHook = hook
}

const fallback_status = (type: CommunicationType, status: ActivityStatus): boolean =>
  status === 'failed' ||
  (type === 'courrier' && status === 'returned') ||
  (type === 'lrar' && (status === 'returned' || status === 'refused')) ||
  (type === 'lre' && (status === 'refused' || status === 'expired'))

export const update_status_with_db = (
  db: Database,
  input: UpdateStatusInput
): { activity: Activite; fallbackScheduled: boolean } => {
  const result = update_communication_status_with_db(db, input)
  if (!result.transition) return { activity: result.activity, fallbackScheduled: false }

  transitionHook?.()
  const { activity, status, occurredAt } = result.transition
  if (status === 'sent') apply_sent_bucket_effect_with_db(db, activity)
  const richConsumed = handle_rich_rcs_status_with_db(db, activity, status, occurredAt)
  if (!richConsumed) settle_bulk_item_for_status_with_db(db, activity, status, occurredAt)
  const fallbackScheduled =
    !richConsumed && fallback_status(input.type, status)
      ? schedule_bulk_fallback_with_db(db, activity, occurredAt)
      : false
  return { activity, fallbackScheduled }
}

export const update_status = (input: UpdateStatusInput): Activite => {
  const db = new Database(datastore_path())
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
  if (result!.fallbackScheduled) queueMicrotask(arm_bulk_scheduler)
  return result!.activity
}
