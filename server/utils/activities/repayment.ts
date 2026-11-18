import { Database } from 'bun:sqlite'

import {
  parseCaseChangeContent,
  parseContentJson,
  parseTaskContent
} from '../../../shared/activity-content'
import { chronological_date_key, sql_date_key } from '../sql-normalization'

export type RepaymentActivityState = {
  bucket: string | null
  derniere_action_realisee: string | null
  date_derniere_action_realisee: string | null
  gestionnaire: string | null
  gestionnaire_email: string | null
  tags: string[]
}

const value_label = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as { id?: unknown; label?: unknown }
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim()
    if (typeof record.id === 'string' && record.id.trim()) return record.id.trim()
  }
  return null
}

type TaskSignal = {
  actions: { id_locataire: string; label: string; date: string }[]
  history: { id_locataire: string; label: string }[]
}

const taskSignals = (db: Database, tenantIds: string[]): TaskSignal => {
  const actions: TaskSignal['actions'] = []
  const history: TaskSignal['history'] = []
  const ids = [...new Set(tenantIds.filter(Boolean))]
  if (ids.length === 0) return { actions, history }
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .query<
      {
        id_locataire: string
        thread_id: string
        type: string
        date_creation: string
        contenu: string
      },
      string[]
    >(
      `SELECT id_locataire, thread_id, type, date_creation, contenu
       FROM activites
       WHERE id_locataire IN (${placeholders})
         AND rattachement = 'repayment:' || id_locataire
         AND type LIKE 'task.%'
         AND thread_id IS NOT NULL
       ORDER BY thread_id, revision DESC, id DESC`
    )
    .all(...ids)

  type Thread = {
    id_locataire: string
    thread_id: string
    head: ReturnType<typeof parseTaskContent>
    headDate: string
    completions: { label: string; date: string }[]
  }
  const threads: Thread[] = []
  for (const row of rows) {
    const content = parseTaskContent(row.contenu)
    const title = content?.task.title.trim() ?? ''
    let thread = threads.at(-1)
    if (!thread || thread.thread_id !== row.thread_id) {
      thread = {
        id_locataire: row.id_locataire,
        thread_id: row.thread_id,
        head: content,
        headDate: row.date_creation,
        completions: []
      }
      threads.push(thread)
    }
    if (row.type === 'task.completed' && content?.task.state === 'completed' && title) {
      thread.completions.push({ label: title, date: row.date_creation })
    }
  }

  for (const thread of threads) {
    const head = thread.head
    if (!head || head.task.state === 'deleted') continue
    const title = head.task.title.trim()
    if (head.task.state === 'completed' && title) {
      actions.push({
        id_locataire: thread.id_locataire,
        label: title,
        date: head.completed_on ? `${head.completed_on}T12:00:00Z` : thread.headDate
      })
      history.push({ id_locataire: thread.id_locataire, label: title })
      continue
    }
    for (const past of thread.completions) {
      actions.push({ id_locataire: thread.id_locataire, label: past.label, date: past.date })
      history.push({ id_locataire: thread.id_locataire, label: past.label })
    }
  }
  return { actions, history }
}

export const latest_repayment_states = (
  db: Database,
  tenantIds: string[]
): Map<string, RepaymentActivityState> => {
  const result = new Map<string, RepaymentActivityState>()
  const ids = [...new Set(tenantIds.filter(Boolean))]
  if (ids.length === 0) return result
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .query<
      {
        id_locataire: string
        type: string
        date_creation: string
        contenu: string
      },
      string[]
    >(
      `SELECT id_locataire, type, date_creation, contenu
       FROM activites
       WHERE id_locataire IN (${placeholders})
         AND rattachement = 'repayment:' || id_locataire
         AND (
           type IN (
             'case.group_changed', 'case.assignee_changed', 'case.tags_changed',
             'bulk.applied'
           )
           OR (
             type LIKE 'communication.%'
             AND json_valid(contenu)
             AND json_type(contenu, '$.action') = 'text'
             AND trim(json_extract(contenu, '$.action')) <> ''
           )
         )
       ORDER BY ${sql_date_key('date_creation')} DESC, id DESC`
    )
    .all(...ids)
  const bucketResolved = new Set<string>()
  const tagsResolved = new Set<string>()
  const actionDates = new Map<string, string>()
  const gestionnaireResolved = new Set<string>()
  for (const row of rows) {
    const state = result.get(row.id_locataire) ?? {
      bucket: null,
      derniere_action_realisee: null,
      date_derniere_action_realisee: null,
      gestionnaire: null,
      gestionnaire_email: null,
      tags: []
    }
    if (!tagsResolved.has(row.id_locataire) && row.type === 'case.tags_changed') {
      const tags = parseCaseChangeContent(row.contenu)
      if (tags && Array.isArray(tags.after)) {
        state.tags = tags.after
          .map((entry) => (typeof entry === 'string' ? entry : entry.label))
          .filter((entry) => entry.trim() !== '')
        tagsResolved.add(row.id_locataire)
      }
    }
    const metadata = parseContentJson(row.contenu)
    if (!bucketResolved.has(row.id_locataire) && row.type === 'case.group_changed') {
      const change = parseCaseChangeContent(row.contenu)
      const bucket = value_label(change?.after)
      if (bucket) {
        state.bucket = bucket
        bucketResolved.add(row.id_locataire)
      }
    }
    if (!bucketResolved.has(row.id_locataire) && row.type === 'bulk.applied') {
      const phase =
        metadata['values'] && typeof metadata['values'] === 'object'
          ? (metadata['values'] as Record<string, unknown>)['phase']
          : metadata['phase']
      if (typeof phase === 'string') {
        state.bucket = phase
        bucketResolved.add(row.id_locataire)
      }
    }
    const actionLabel =
      row.type === 'bulk.applied' && typeof metadata['title'] === 'string'
        ? metadata['title']
        : typeof metadata['action'] === 'string'
          ? metadata['action']
          : null
    const actionDate = actionLabel ? row.date_creation : null
    const actionDateKey = actionDate ? chronological_date_key(actionDate) : null
    const latestActionDateKey = actionDates.get(row.id_locataire)
    if (
      actionLabel &&
      actionDate &&
      actionDateKey &&
      (!latestActionDateKey || actionDateKey > latestActionDateKey)
    ) {
      state.derniere_action_realisee = actionLabel
      state.date_derniere_action_realisee = actionDate
      actionDates.set(row.id_locataire, actionDateKey)
    }
    if (!gestionnaireResolved.has(row.id_locataire) && row.type === 'case.assignee_changed') {
      const change = parseCaseChangeContent(row.contenu)
      const email = value_label(change?.after)
      if (email) {
        state.gestionnaire = email
        state.gestionnaire_email = email.replace(/^user:/, '').toLowerCase()
        gestionnaireResolved.add(row.id_locataire)
      }
    }
    result.set(row.id_locataire, state)
  }
  for (const action of taskSignals(db, ids).actions) {
    const actionDateKey = chronological_date_key(action.date)
    const latestActionDateKey = actionDates.get(action.id_locataire)
    if (!actionDateKey || (latestActionDateKey && actionDateKey <= latestActionDateKey)) continue
    const state = result.get(action.id_locataire) ?? {
      bucket: null,
      derniere_action_realisee: null,
      date_derniere_action_realisee: null,
      gestionnaire: null,
      gestionnaire_email: null,
      tags: []
    }
    state.derniere_action_realisee = action.label
    state.date_derniere_action_realisee = action.date
    actionDates.set(action.id_locataire, actionDateKey)
    result.set(action.id_locataire, state)
  }
  return result
}

/** Latest repayment tag snapshot per tenant; tenants without a snapshot have no tags. */
export const repayment_action_history = (
  db: Database,
  tenantIds: string[]
): Map<string, Set<string>> => {
  const result = new Map<string, Set<string>>()
  const ids = [...new Set(tenantIds.filter(Boolean))]
  if (ids.length === 0) return result
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .query<{ id_locataire: string; label: string }, string[]>(
      `SELECT DISTINCT id_locataire, label
       FROM (
         SELECT id_locataire,
           CASE
             WHEN type = 'bulk.applied'
               AND json_valid(contenu)
               AND json_type(contenu, '$.title') = 'text'
               AND trim(json_extract(contenu, '$.title')) <> ''
             THEN trim(json_extract(contenu, '$.title'))
             WHEN json_valid(contenu)
               AND json_type(contenu, '$.action') = 'text'
               AND trim(json_extract(contenu, '$.action')) <> ''
             THEN trim(json_extract(contenu, '$.action'))
             ELSE NULL
           END AS label
         FROM activites
         WHERE id_locataire IN (${placeholders})
           AND rattachement = 'repayment:' || id_locataire
           AND (
             type = 'bulk.applied'
             OR type LIKE 'communication.%'
           )
       )
       WHERE label IS NOT NULL`
    )
    .all(...ids)
  for (const row of rows) {
    const set = result.get(row.id_locataire) ?? new Set<string>()
    set.add(row.label)
    result.set(row.id_locataire, set)
  }
  for (const row of taskSignals(db, ids).history) {
    const set = result.get(row.id_locataire) ?? new Set<string>()
    set.add(row.label)
    result.set(row.id_locataire, set)
  }
  return result
}
