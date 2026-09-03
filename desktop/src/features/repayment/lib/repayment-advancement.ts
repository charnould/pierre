import { deriveCaseAssignment } from '@/shared/lib/activities/case-activities'
import {
  activity_payload,
  parse_case_change_content,
  parse_communication_opened_content,
  parse_task_content,
  type Activite
} from '@/shared/types/activites'

import type { RepaymentActionId } from './repayment-action'
import { sortRepaymentActivitiesDesc } from './repayment-activity-order'
import { isRepaymentBucketId, type RepaymentBucketId } from './repayment-bucket'

export type RepaymentAdvancement = {
  bucket: RepaymentBucketId | null
  action: RepaymentActionId | null
}

export type RepaymentGestionnaireAssignment = {
  email: string | null
  login: string | null
}

export function deriveRepaymentAdvancementFromSorted(
  activities: readonly Activite[]
): RepaymentAdvancement {
  let bucket: RepaymentBucketId | null = null
  let action: RepaymentActionId | null = null

  for (const row of activities) {
    const payload = activity_payload(row.type, row.contenu)
    if (bucket === null && row.type === 'case.group_changed') {
      const change = parse_case_change_content(row.contenu)
      const value = typeof change?.after === 'string' ? change.after : null
      if (value && isRepaymentBucketId(value)) bucket = value
    }
    if (bucket === null && row.type === 'bulk.applied') {
      const phase =
        payload['values'] && typeof payload['values'] === 'object'
          ? (payload['values'] as Record<string, unknown>)['phase']
          : payload['phase']
      if (typeof phase === 'string' && isRepaymentBucketId(phase)) bucket = phase
    }
    const task = parse_task_content(row.contenu)
    if (action === null && row.type === 'task.completed' && task) {
      action = task.task.title
    } else if (
      action === null &&
      row.type === 'bulk.applied' &&
      typeof payload['title'] === 'string'
    ) {
      action = payload['title']
    } else if (action === null && row.type === 'communication.sent') {
      const opened = parse_communication_opened_content(row.contenu)
      if (opened?.action) action = opened.action
    }
    if (bucket !== null && action !== null) break
  }

  return { bucket, action }
}

export function deriveRepaymentAdvancement(activities: Activite[]): RepaymentAdvancement {
  return deriveRepaymentAdvancementFromSorted(sortRepaymentActivitiesDesc(activities))
}

/** Latest Pierre referent assignment from shared case activities. */
export function deriveRepaymentGestionnaireFromSorted(
  activities: readonly Activite[]
): RepaymentGestionnaireAssignment {
  return deriveCaseAssignment(activities)
}

export function deriveRepaymentGestionnaire(
  activities: Activite[]
): RepaymentGestionnaireAssignment {
  return deriveRepaymentGestionnaireFromSorted(sortRepaymentActivitiesDesc(activities))
}
