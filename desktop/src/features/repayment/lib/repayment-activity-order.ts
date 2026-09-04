import { actionTimelineDate } from '@/shared/lib/activities/action-activity'
import type { Activite } from '@/shared/types/activites'

export function sortRepaymentActivitiesDesc(activities: readonly Activite[]): Activite[] {
  return [...activities].sort((a, b) => {
    const dateCmp = actionTimelineDate(b).localeCompare(actionTimelineDate(a))
    if (dateCmp !== 0) return dateCmp
    return b.id - a.id
  })
}
