import {
  type Activity,
  isCommunicationStatusType,
  isHiddenTimelineType,
  parseActivityMetaContent
} from '@/shared/types/activites'

export type ProjectedTimelineItem =
  { kind: 'event'; row: Activity } | { kind: 'communication'; row: Activity; statuses: Activity[] }

export function projectTimelineItems(rows: readonly Activity[]): ProjectedTimelineItem[] {
  const statuses = new Map<string, Activity[]>()
  const sends = new Map<string, Activity[]>()
  const reactions = new Map<number, string>()
  for (const row of rows) {
    if (row.type === 'activity.reaction_changed') {
      const content = parseActivityMetaContent(row.contenu)
      if (content?.emoji) reactions.set(content.source_activity_id, content.emoji)
      continue
    }
    if (isCommunicationStatusType(row.type) && row.threadId) {
      const list = statuses.get(row.threadId) ?? []
      list.push(row)
      statuses.set(row.threadId, list)
    }
    if (row.type === 'communication.sent' && row.threadId) {
      const list = sends.get(row.threadId) ?? []
      list.push(row)
      sends.set(row.threadId, list)
    }
  }
  for (const list of sends.values()) {
    list.sort((left, right) => (left.revision ?? 0) - (right.revision ?? 0))
  }

  return rows
    .filter((row) => !isHiddenTimelineType(row.type))
    .map((row) => {
      if (row.type === 'communication.sent' && row.threadId) {
        const revision = row.revision ?? 0
        const nextRevision = sends
          .get(row.threadId)
          ?.find((candidate) => (candidate.revision ?? 0) > revision)?.revision
        const threadStatuses = (statuses.get(row.threadId) ?? [])
          .filter(
            (status) =>
              (status.revision ?? 0) > revision &&
              (nextRevision == null || (status.revision ?? 0) < nextRevision)
          )
          .sort((left, right) => {
            const revisionOrder = (left.revision ?? 0) - (right.revision ?? 0)
            if (revisionOrder !== 0) return revisionOrder
            const id = left.id - right.id
            if (id !== 0) return id
            return left.createdAt.localeCompare(right.createdAt)
          })
        return { kind: 'communication' as const, row, statuses: threadStatuses }
      }
      return { kind: 'event' as const, row }
    })
}
