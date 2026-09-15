import { Database } from 'bun:sqlite'

import type { Activite } from '../../shared/activites'
import { get_activity_with_db } from './activities/rows'
import {
  apply_sent_bucket_effect_with_db,
  schedule_bulk_fallback_with_db,
  settle_bulk_item_for_status_with_db,
  type DeliveryStatus
} from './bulk/jobs'
import { handle_rich_rcs_status_with_db } from './bulk/rich-rcs'
import { arm_bulk_scheduler } from './bulk/scheduler/queue'
import { create_sms_fallback_with_db } from './communications/rcs-sms-fallback'
import {
  project_communication_status_with_db,
  type UpdateStatusInput
} from './communications/status'
import { datastore_path } from './communications/storage'

let transitionHook: (() => void) | null = null

export const set_delivery_status_hook_for_tests = (hook: (() => void) | null): void => {
  transitionHook = hook
}

const fallback_status = (type: string | undefined, status: string): boolean =>
  status === 'failed' ||
  (type === 'courrier' && status === 'returned') ||
  (type === 'lrar' && (status === 'returned' || status === 'refused')) ||
  (type === 'lre' && (status === 'refused' || status === 'expired'))

export const update_status_with_db = (
  db: Database,
  input: UpdateStatusInput
): { activity: Activite; fallbackScheduled: boolean } => {
  const source = get_activity_with_db(db, input.activity_id)
  const result = project_communication_status_with_db(db, input)
  if (!result.transition) return { activity: result.activity, fallbackScheduled: false }

  transitionHook?.()
  const { activity, status, occurredAt } = result.transition
  const trackedActivity = source ?? activity
  if (status === 'sent') apply_sent_bucket_effect_with_db(db, trackedActivity)
  const deliveryStatus = status as DeliveryStatus
  const richConsumed = handle_rich_rcs_status_with_db(
    db,
    trackedActivity,
    deliveryStatus,
    occurredAt
  )
  if (!richConsumed) {
    settle_bulk_item_for_status_with_db(db, trackedActivity, deliveryStatus, occurredAt)
  }
  const failed = fallback_status(input.type, status)
  const fallbackScheduled =
    !richConsumed && failed
      ? schedule_bulk_fallback_with_db(db, trackedActivity, occurredAt)
      : false
  if (failed && !trackedActivity.bulk_id && trackedActivity.channel === 'rcs') {
    create_sms_fallback_with_db(db, trackedActivity)
  }
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
