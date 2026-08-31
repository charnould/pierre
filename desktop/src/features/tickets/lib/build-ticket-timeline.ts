import { is_boost_notification, type Activite } from '@/shared/types/activites'

export type TicketTimelineItem = {
  source: 'activity'
  id: string
  date: string
  row: Activite
}

function mapActivityToEntry(row: Activite): TicketTimelineItem {
  return {
    source: 'activity',
    id: `activity:${row.id}`,
    date: row.date_creation,
    row
  }
}

export function buildTicketTimeline(activities: Activite[]): TicketTimelineItem[] {
  return activities
    .filter((row) => !is_boost_notification(row.type))
    .map(mapActivityToEntry)
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date)
      if (dateCmp !== 0) return dateCmp
      return b.id.localeCompare(a.id)
    })
}
