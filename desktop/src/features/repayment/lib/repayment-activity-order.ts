import type { Activite } from '@/shared/types/activites'

import { repaymentActionTimelineDate } from './repayment-action-activity'

export function sortRepaymentActivitiesDesc(activities: readonly Activite[]): Activite[] {
  return [...activities].sort((a, b) => {
    const dateCmp = repaymentActionTimelineDate(b).localeCompare(repaymentActionTimelineDate(a))
    if (dateCmp !== 0) return dateCmp
    return b.id - a.id
  })
}
