import { Database } from 'bun:sqlite'

import { type Activity } from '../../shared/activities'
import { get_activity_with_db } from './activities/rows'
import {
  apply_sent_bucket_effect_with_db,
  type DeliveryStatus,
  schedule_bulk_fallback_with_db,
  settle_bulk_item_for_status_with_db
} from './bulk/jobs'
import { handle_rich_rcs_status_with_db } from './bulk/rich-rcs'
import { arm_bulk_scheduler } from './bulk/scheduler/queue'
import {
  project_communication_status_with_db,
  type UpdateStatusInput
} from './communications/status'
import { complete_outbound_dispatch_with_db } from './communications/storage'
import { openDatastore } from './datastore-db'

let transitionHook: (() => void) | null = null

export const set_delivery_status_hook_for_tests = (hook: (() => void) | null): void => {
  transitionHook = hook
}

const fallback_status = (type: string | undefined, status: string): boolean =>
  status === 'failed' ||
  (type === 'courrier' && status === 'returned') ||
  (type === 'lrar' && (status === 'returned' || status === 'refused')) ||
  ((type === 'lre' || type === 'ere') &&
    (status === 'refused' || status === 'expired' || status === 'unclaimed'))

export const update_status_with_db = (
  db: Database,
  input: UpdateStatusInput
): { activity: Activity; fallbackScheduled: boolean; projected: boolean } => {
  const source = get_activity_with_db(db, input.activity_id)
  const result = project_communication_status_with_db(db, input)
  complete_outbound_dispatch_with_db(db, input.activity_id)
  if (!result.transition) {
    return { activity: result.activity, fallbackScheduled: false, projected: false }
  }

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
  return { activity, fallbackScheduled, projected: true }
}

export const settle_delivery = (input: UpdateStatusInput): { activity: Activity } => {
  const db = openDatastore()
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
  return { activity: result!.activity }
}

export const update_status = (input: UpdateStatusInput): Activity => settle_delivery(input).activity
