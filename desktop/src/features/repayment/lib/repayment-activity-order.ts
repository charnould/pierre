import { actionTimelineDate } from '@/shared/lib/activities/action-activity'
import type { Activity } from '@/shared/types/activites'

export function sortRepaymentActivitiesDesc(activities: readonly Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    const dateCmp = actionTimelineDate(b).localeCompare(actionTimelineDate(a))
    if (dateCmp !== 0) return dateCmp
    return b.id - a.id
  })
}
