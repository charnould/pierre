import { Database } from 'bun:sqlite'

import {
  type Activity,
  activityTimestamp,
  type CaseFileChronologyAction,
  type CaseFileChronologyItem
} from '../../../shared/activities'
import {
  caseChangeContent,
  completedTaskContent,
  parseCaseChangeContent,
  parseContentJson,
  parseTaskContent,
  type TaskChange,
  type TaskContent
} from '../../../shared/activity-content'
import { configuredPhases, defaultPhase } from '../../../shared/repayment-phases'
import { repaymentPhases } from '../setup-store'
import { insert_task_event } from './action'
import {
  type ActivityDbRow,
  type ActivityFacets,
  build_mentions,
  insert_activity_row,
  row_to_activity
} from './rows'
import { ActivitiesError } from './schema'

const likePrefix = (threadId: string): string =>
  `${threadId.replace(/[\\%_]/g, (char) => `\\${char}`)}:%`

const realizationTimestamp = (day: string): string => `${day}T12:00:00Z`

const chronologyContent = (item: CaseFileChronologyAction, changes?: TaskChange[]): TaskContent =>
  completedTaskContent({
    title: item.action,
    completed_on: item.date_realisation,
    ...(item.commentaire ? { result: item.commentaire } : {}),
    changes
  })

const deletedContent = (content: TaskContent): TaskContent => ({
  version: 1,
  task: { title: content.task.title, state: 'deleted' },
  ...(content.completed_on ? { completed_on: content.completed_on } : {}),
  ...(content.result ? { result: content.result } : {})
})

const changesFor = (content: TaskContent, item: CaseFileChronologyAction): TaskChange[] => {
  const changes: TaskChange[] = []
  if (content.task.title !== item.action) {
    changes.push({ field: 'title', before: content.task.title, after: item.action })
  }
  if (content.completed_on !== item.date_realisation) {
    changes.push({
      field: 'completed_on',
      before: content.completed_on ?? null,
      after: item.date_realisation
    })
  }
  const comment = content.result ?? null
  if (comment !== item.commentaire) {
    changes.push({ field: 'result', before: comment, after: item.commentaire })
  }
  return changes
}

const chronologyHeads = (db: Database, planThreadId: string): Map<string, Activity> => {
  const rows = db
    .query<ActivityDbRow, [string]>(
      `SELECT * FROM activites
       WHERE type LIKE 'task.%' AND thread_id LIKE ? ESCAPE '\\'
       ORDER BY thread_id, revision DESC, id DESC`
    )
    .all(likePrefix(planThreadId))
  const heads = new Map<string, Activity>()
  for (const row of rows) {
    if (!row.thread_id || heads.has(row.thread_id)) continue
    if (!row.thread_id.startsWith(`${planThreadId}:`)) continue
    let activity: Activity
    try {
      activity = row_to_activity(row)
    } catch {
      throw new ActivitiesError('Invalid chronology activity')
    }
    heads.set(row.thread_id, activity)
  }
  return heads
}

export const sync_plan_chronology = (
  db: Database,
  plan: Activity,
  items: CaseFileChronologyItem[],
  auteur: string
): void => {
  if (!plan.threadId) throw new ActivitiesError('Invalid repayment plan', 'invalid_body')
  const facets: ActivityFacets = {
    id_client: plan.id_client,
    id_locataire: plan.id_locataire,
    id_lot: plan.id_lot
  }
  const actions = items.filter((item): item is CaseFileChronologyAction => item.kind === 'action')
  const heads = chronologyHeads(db, plan.threadId)
  const seen = new Set<string>()
  const writes: Array<{
    contenu: TaskContent
    type: 'task.completed' | 'task.updated' | 'task.deleted'
    date_creation: string
    thread_id: string
    revision: number
  }> = []

  for (const [threadId, activity] of heads) {
    const id = threadId.slice(plan.threadId.length + 1)
    const content = parseTaskContent(activity.contenu)
    if (
      !id ||
      !content?.completed_on ||
      activity.revision == null ||
      (content.task.state !== 'completed' && content.task.state !== 'deleted')
    ) {
      throw new ActivitiesError('Invalid chronology activity')
    }
    const item = actions.find((candidate) => candidate.id === id)
    if (content.task.state === 'deleted') {
      if (item) {
        throw new ActivitiesError('Deleted chronology action cannot be restored', 'conflict')
      }
      continue
    }
    if (!item) {
      writes.push({
        contenu: deletedContent(content),
        type: 'task.deleted',
        date_creation: activityTimestamp(),
        thread_id: threadId,
        revision: activity.revision + 1
      })
      continue
    }
    seen.add(id)
    const changes = changesFor(content, item)
    if (changes.length === 0) continue
    writes.push({
      contenu: chronologyContent(item, changes),
      type: 'task.updated',
      date_creation: activityTimestamp(),
      thread_id: threadId,
      revision: activity.revision + 1
    })
  }

  for (const item of actions) {
    if (seen.has(item.id)) continue
    writes.push({
      contenu: chronologyContent(item),
      type: 'task.completed',
      date_creation: realizationTimestamp(item.date_realisation),
      thread_id: `${plan.threadId}:${item.id}`,
      revision: 1
    })
  }

  for (const write of writes) {
    insert_task_event(db, {
      date_creation: write.date_creation,
      rattachement: plan.rattachement,
      auteur,
      facets,
      contenu: write.contenu,
      thread_id: write.thread_id,
      type: write.type,
      revision: write.revision,
      mentions: build_mentions(db, JSON.stringify(write.contenu), [])
    })
  }
  appendPhaseChanges(db, plan, items, auteur, facets)
}

const phaseLabel = (type: string, contenu: string): string | null => {
  if (type === 'case.group_changed') {
    const after = parseCaseChangeContent(contenu)?.after
    return typeof after === 'string' && after.trim() ? after : null
  }
  const values = parseContentJson(contenu)['values']
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null
  const record = values as Record<string, unknown>
  const phase = record['phase'] ?? record['after']
  return typeof phase === 'string' && phase.trim() ? phase : null
}

const appendPhaseChanges = (
  db: Database,
  plan: Activity,
  items: CaseFileChronologyItem[],
  auteur: string,
  facets: ActivityFacets
): void => {
  const drafts = items.flatMap((item, index) => (item.kind === 'phase' ? [{ item, index }] : []))
  if (drafts.length === 0) return
  const allowed = new Set(configuredPhases(repaymentPhases()))
  for (const draft of drafts) {
    if (!allowed.has(draft.item.phase)) throw new ActivitiesError('Invalid repayment phase')
  }
  const markers: Array<{ at: string; order: number; after: string }> = []
  const rows = db
    .query<{ id: number; date_creation: string; type: string; contenu: string }, [string]>(
      `SELECT id, date_creation, type, contenu FROM activites
       WHERE rattachement = ? AND type IN ('case.group_changed', 'bulk.applied')
       ORDER BY date_creation, id`
    )
    .all(plan.rattachement)
  for (const row of rows) {
    const after = phaseLabel(row.type, row.contenu)
    if (after) markers.push({ at: row.date_creation, order: row.id, after })
  }
  const events: Array<
    | { at: string; stored: true; order: number; after: string }
    | {
        at: string
        stored: false
        order: number
        item: CaseFileChronologyItem & { kind: 'phase' }
      }
  > = [
    ...markers.map((marker) => ({
      at: marker.at,
      stored: true as const,
      order: marker.order,
      after: marker.after
    })),
    ...drafts.map((draft) => ({
      at: realizationTimestamp(draft.item.date_realisation),
      stored: false as const,
      order: draft.index,
      item: draft.item
    }))
  ]
  events.sort((left, right) => {
    const byTime = left.at.localeCompare(right.at)
    if (byTime !== 0) return byTime
    if (left.stored !== right.stored) return left.stored ? -1 : 1
    return left.order - right.order
  })
  let current = defaultPhase([...allowed])
  for (const event of events) {
    if (event.stored) {
      current = event.after
      continue
    }
    if (event.item.phase === current && !event.item.commentaire) continue
    const contenu = caseChangeContent({
      before: current,
      after: event.item.phase,
      ...(event.item.commentaire ? { note: event.item.commentaire } : {})
    })
    const raw = JSON.stringify(contenu)
    insert_activity_row(db, {
      date_creation: event.at,
      rattachement: plan.rattachement,
      auteur,
      facets,
      type: 'case.group_changed',
      contenu: raw,
      mentions: build_mentions(db, raw, [])
    })
    current = event.item.phase
  }
}
