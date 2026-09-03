import {
  is_communication_status_type,
  is_hidden_timeline_type,
  parse_activity_meta_content,
  type Activite
} from '@/shared/types/activites'

export type ProjectedTimelineItem =
  | { kind: 'event'; row: Activite }
  | { kind: 'communication'; row: Activite; statuses: Activite[] }

export function projectTimelineItems(rows: readonly Activite[]): ProjectedTimelineItem[] {
  const statuses = new Map<string, Activite[]>()
  const reactions = new Map<number, string>()
  for (const row of rows) {
    if (row.type === 'activity.reaction_changed') {
      const content = parse_activity_meta_content(row.contenu)
      if (content?.emoji) reactions.set(content.source_activity_id, content.emoji)
      continue
    }
    if (is_communication_status_type(row.type) && row.thread_id) {
      const list = statuses.get(row.thread_id) ?? []
      list.push(row)
      statuses.set(row.thread_id, list)
    }
  }

  return rows
    .filter((row) => !is_hidden_timeline_type(row.type))
    .map((row) => {
      if (row.type === 'communication.sent' && row.thread_id) {
        const threadStatuses = (statuses.get(row.thread_id) ?? []).sort((left, right) => {
          const revision = (left.revision ?? 0) - (right.revision ?? 0)
          if (revision !== 0) return revision
          const id = left.id - right.id
          if (id !== 0) return id
          return left.date_creation.localeCompare(right.date_creation)
        })
        return { kind: 'communication' as const, row, statuses: threadStatuses }
      }
      return { kind: 'event' as const, row }
    })
}
