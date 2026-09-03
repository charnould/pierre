import { timelineActivityVerb } from '@/shared/lib/timeline/timeline-verb'
import type { Activite } from '@/shared/types/activites'

export const TIMELINE_MOVEMENT_TITLE = 'Mouvement comptable'

export function timelineActivityActionVerb(row: Activite): string {
  return timelineActivityVerb(row)
}

export function formatTimelineActivityTitle(actorName: string, row: Activite): string {
  const name = actorName.trim() || 'Inconnu'
  return `${name} ${timelineActivityVerb(row)}`
}
