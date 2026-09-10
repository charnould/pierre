import { Database } from 'bun:sqlite'

import {
  parse_case_change_content,
  parse_contenu_json,
  parse_task_content
} from '../../../shared/activites'
import { chronological_date_key, sql_date_key } from '../sql-normalization'

export type RepaymentActivityState = {
  bucket: string | null
  derniere_action_realisee: string | null
  date_derniere_action_realisee: string | null
  gestionnaire: string | null
  gestionnaire_email: string | null
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
             'case.group_changed', 'case.assignee_changed',
             'task.completed', 'bulk.applied'
           )
           OR type LIKE 'communication.%'
         )
       ORDER BY ${sql_date_key('date_creation')} DESC, id DESC`
    )
    .all(...ids)
  const bucketResolved = new Set<string>()
  const actionDates = new Map<string, string>()
  const gestionnaireResolved = new Set<string>()
  for (const row of rows) {
    const state = result.get(row.id_locataire) ?? {
      bucket: null,
      derniere_action_realisee: null,
      date_derniere_action_realisee: null,
      gestionnaire: null,
      gestionnaire_email: null
    }
    const metadata = parse_contenu_json(row.contenu)
    if (!bucketResolved.has(row.id_locataire) && row.type === 'case.group_changed') {
      const change = parse_case_change_content(row.contenu)
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
    const task = row.type === 'task.completed' ? parse_task_content(row.contenu) : null
    const actionLabel =
      task?.task.title ??
      (row.type === 'bulk.applied' && typeof metadata['title'] === 'string'
        ? metadata['title']
        : typeof metadata['action'] === 'string'
          ? metadata['action']
          : null)
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
      const change = parse_case_change_content(row.contenu)
      const email = value_label(change?.after)
      if (email) {
        state.gestionnaire = email
        state.gestionnaire_email = email.replace(/^user:/, '').toLowerCase()
        gestionnaireResolved.add(row.id_locataire)
      }
    }
    result.set(row.id_locataire, state)
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
    .query<{ id_locataire: string; type: string; contenu: string }, string[]>(
      `SELECT id_locataire, type, contenu
       FROM activites
       WHERE id_locataire IN (${placeholders})
         AND rattachement = 'repayment:' || id_locataire
         AND (
           type IN ('task.completed', 'bulk.applied')
           OR type LIKE 'communication.%'
         )`
    )
    .all(...ids)
  for (const row of rows) {
    const metadata = parse_contenu_json(row.contenu)
    const task = row.type === 'task.completed' ? parse_task_content(row.contenu) : null
    const label =
      task?.task.title ??
      (row.type === 'bulk.applied' && typeof metadata['title'] === 'string'
        ? metadata['title']
        : typeof metadata['action'] === 'string'
          ? metadata['action']
          : null)
    if (!label?.trim()) continue
    const set = result.get(row.id_locataire) ?? new Set<string>()
    set.add(label)
    result.set(row.id_locataire, set)
  }
  return result
}
