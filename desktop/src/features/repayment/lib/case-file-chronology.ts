import type { CaseFileChronologyItem } from '@pierre/shared/activities'
import { parseCaseChangeContent, parseTaskContent } from '@pierre/shared/activity-content'

type ChronologySource = {
  id: number
  threadId?: string | null
  type: string
  revision?: number | null
  contenu: string
  createdAt?: string
}

export type ChronologyEntry = {
  key: string
  origin: number
  editable: boolean
  before?: string | null
  item: CaseFileChronologyItem
}

export function sortChronology(entries: readonly ChronologyEntry[]): ChronologyEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const byDate = left.entry.item.date_realisation.localeCompare(
        right.entry.item.date_realisation
      )
      if (byDate !== 0) return byDate
      if (left.entry.editable !== right.entry.editable) return left.entry.editable ? 1 : -1
      return left.entry.origin - right.entry.origin || left.index - right.index
    })
    .map(({ entry }) => entry)
}

export function toChronologyPayload(entries: readonly ChronologyEntry[]): CaseFileChronologyItem[] {
  return entries.flatMap((entry) => (entry.editable ? [entry.item] : []))
}

export function prepareChronologyPayload(
  entries: readonly ChronologyEntry[]
): { ok: true; items: CaseFileChronologyItem[] } | { ok: false } {
  for (const entry of entries) {
    if (!entry.editable) continue
    const label = entry.item.kind === 'action' ? entry.item.action : entry.item.phase
    if (!entry.item.date_realisation || !label.trim()) return { ok: false }
  }
  return {
    ok: true,
    items: toChronologyPayload(entries).map((item) => {
      const commentaire = item.commentaire?.trim() ? item.commentaire.trim() : null
      return item.kind === 'action'
        ? { ...item, action: item.action.trim(), commentaire }
        : { ...item, phase: item.phase.trim(), commentaire }
    })
  }
}

export function chronologyFromActivities(
  planThreadId: string,
  rows: readonly ChronologySource[]
): ChronologyEntry[] {
  const prefix = planThreadId ? `${planThreadId}:` : ''
  const heads = new Map<string, { row: ChronologySource; origin: number }>()
  const entries: ChronologyEntry[] = []
  for (const row of rows) {
    if (row.type === 'case.group_changed') {
      const change = parseCaseChangeContent(row.contenu)
      const phase = typeof change?.after === 'string' ? change.after.trim() : ''
      if (!phase) continue
      entries.push({
        key: `phase:${row.id}`,
        origin: row.id,
        editable: false,
        before: typeof change?.before === 'string' ? change.before : null,
        item: {
          kind: 'phase',
          phase,
          date_realisation: (row.createdAt ?? '').slice(0, 10),
          commentaire: change?.note ?? null
        }
      })
      continue
    }
    if (!row.threadId || !row.type.startsWith('task.')) continue
    const current = heads.get(row.threadId)
    if (!current) {
      heads.set(row.threadId, { row, origin: row.id })
      continue
    }
    const newer =
      (row.revision ?? 0) > (current.row.revision ?? 0) ||
      ((row.revision ?? 0) === (current.row.revision ?? 0) && row.id > current.row.id)
    heads.set(row.threadId, {
      row: newer ? row : current.row,
      origin: Math.min(current.origin, row.id)
    })
  }
  for (const [threadId, head] of heads) {
    const content = parseTaskContent(head.row.contenu)
    if (!content || content.task.state !== 'completed') continue
    const owned = Boolean(prefix && threadId.startsWith(prefix))
    if (owned) {
      if (!content.completed_on) continue
      const id = threadId.slice(prefix.length)
      entries.push({
        key: id,
        origin: head.origin,
        editable: true,
        item: {
          kind: 'action',
          id,
          action: content.task.title,
          date_realisation: content.completed_on,
          commentaire: content.result ?? null
        }
      })
      continue
    }
    entries.push({
      key: `task:${threadId}`,
      origin: head.origin,
      editable: false,
      item: {
        kind: 'action',
        id: threadId,
        action: content.task.title,
        date_realisation: content.completed_on ?? (head.row.createdAt ?? '').slice(0, 10),
        commentaire: content.result ?? null
      }
    })
  }
  return sortChronology(entries)
}
