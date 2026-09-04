import { deriveCaseAssignment } from '@/shared/lib/activities/case-activities'
import type { Activite } from '@/shared/types/activites'
import {
  activity_payload,
  parse_action_activity_content,
  parse_case_bucket_change_content
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
    const caseBucket =
      row.type === 'case_bucket_change'
        ? parse_case_bucket_change_content(row.contenu)?.bucket
        : null
    const phase = row.type === 'bulk_application' ? payload['phase'] : caseBucket
    if (
      bucket === null &&
      (row.type === 'case_bucket_change' || row.type === 'bulk_application') &&
      typeof phase === 'string' &&
      isRepaymentBucketId(phase)
    ) {
      bucket = phase
    }
    const actionContent = row.type === 'action' ? parse_action_activity_content(row.contenu) : null
    if (action === null && actionContent?.etat === 'fait') {
      action = actionContent.action
    } else if (
      action === null &&
      row.type === 'bulk_application' &&
      typeof payload['action'] === 'string'
    ) {
      action = payload['action']
    } else if (
      action === null &&
      ['rcs', 'sms', 'email', 'courrier', 'lrar', 'lre', 'signature'].includes(row.type) &&
      row.statut != null &&
      ['sent', 'delivered', 'read', 'signed'].includes(row.statut) &&
      typeof payload['action'] === 'string'
    ) {
      action = payload['action']
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
