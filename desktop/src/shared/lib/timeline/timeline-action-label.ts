import { timelineActivityVerb } from '@/shared/lib/timeline/timeline-verb'
import type { Activity } from '@/shared/types/activites'

export const TIMELINE_MOVEMENT_TITLE = 'Mouvement comptable'

export function timelineActivityActionVerb(row: Activity): string {
  return timelineActivityVerb(row)
}

export function formatTimelineActivityTitle(actorName: string, row: Activity): string {
  const name = actorName.trim() || 'Inconnu'
  return `${name} ${timelineActivityVerb(row)}`
}
