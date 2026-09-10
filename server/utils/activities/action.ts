import { Database } from 'bun:sqlite'

import {
  type Activite,
  type ActivityPatch,
  type ActivityType,
  type EntityRef,
  type Mention,
  type TaskChange,
  type TaskContent,
  activity_timestamp,
  entity_ref,
  parse_task_content
} from '../../../shared/activites'
import {
  build_mentions,
  insert_activity_row,
  org_email_index,
  resolve_destinataire,
  type ActivityDbRow,
  type ActivityFacets,
  row_to_activity,
  user_destinataire
} from './rows'
import { ActivitiesError } from './schema'

const assignee_ref = (identity: string): EntityRef => {
  const id = identity.trim()
  const label = id.startsWith('user:') ? id.slice(5) : id
  return entity_ref(id, label)
}

export function insert_task_event(
  db: Database,
  values: {
    date_creation: string
    rattachement: string
    auteur: string
    facets: ActivityFacets
    contenu: TaskContent
    thread_id: string
    type: Extract<ActivityType, `task.${string}`>
    revision: number
    mentions: Mention[]
    idempotency_key?: string | null
  }
): Activite {
  return insert_activity_row(db, {
    date_creation: values.date_creation,
    rattachement: values.rattachement,
    auteur: values.auteur,
    facets: values.facets,
    type: values.type,
    mentions: values.mentions,
    contenu: JSON.stringify(values.contenu),
    thread_id: values.thread_id,
    revision: values.revision,
    idempotency_key: values.idempotency_key ?? null
  })
}

export const patch_action = (
  db: Database,
  actor: string,
  existing: Activite,
  parsed: ActivityPatch
): Activite | null => {
  if (
    parsed.operation !== 'update_action' &&
    parsed.operation !== 'complete_action' &&
    parsed.operation !== 'reopen_action' &&
    parsed.operation !== 'ignore_action'
  ) {
    return null
  }
  if (!existing.type.startsWith('task.') || !existing.thread_id || existing.revision == null) {
    throw new ActivitiesError('Activity is not a task', 'invalid_body')
  }

  const latestRow = db
    .query<ActivityDbRow, [string]>(
      `SELECT * FROM activites
       WHERE thread_id = ? AND type LIKE 'task.%'
       ORDER BY revision DESC LIMIT 1`
    )
    .get(existing.thread_id)
  if (!latestRow) throw new ActivitiesError('Action thread not found', 'not_found')
  const latest = row_to_activity(latestRow)
  if (latest.id !== existing.id) {
    throw new ActivitiesError('Action changed since it was loaded', 'conflict')
  }
  const action = parse_task_content(latest.contenu)
  if (!action) throw new ActivitiesError('Invalid action content', 'invalid_body')

  const actorDestinataire = user_destinataire(actor)
  const assigneeId = action.task.assignee?.id ?? null
  const isAssignee = assigneeId === actorDestinataire
  const created = db
    .query<{ auteur: string }, [string]>(
      `SELECT auteur FROM activites WHERE thread_id = ? AND type = 'task.created' LIMIT 1`
    )
    .get(existing.thread_id)
  const isCreator = created?.auteur === actorDestinataire
  const now = activity_timestamp()
  let type: Extract<ActivityType, `task.${string}`>
  let next: TaskContent

  if (parsed.operation === 'update_action') {
    if (!isCreator && !isAssignee) throw new ActivitiesError('Forbidden', 'forbidden')
    if (action.task.state !== 'open') {
      throw new ActivitiesError('Only open actions can be edited', 'forbidden')
    }
    const nextAssignee = resolve_destinataire(parsed.assigne_a, org_email_index(db))
    if (!nextAssignee) throw new ActivitiesError('Unknown assignee')
    const assignee = assignee_ref(nextAssignee)
    const changes: TaskChange[] = []
    if (action.task.title !== parsed.action) {
      changes.push({ field: 'title', before: action.task.title, after: parsed.action })
    }
    if (action.task.assignee?.id !== assignee.id) {
      changes.push({
        field: 'assignee',
        before: action.task.assignee ?? null,
        after: assignee
      })
    }
    if (action.task.due_date !== parsed.date_echeance) {
      changes.push({
        field: 'due_date',
        before: action.task.due_date ?? null,
        after: parsed.date_echeance
      })
    }
    const note = parsed.note?.trim() || undefined
    if ((action.note ?? '') !== (note ?? '')) {
      changes.push({ field: 'note', before: action.note ?? null, after: note ?? null })
    }
    type = 'task.updated'
    next = {
      version: 2,
      task: {
        title: parsed.action,
        state: 'open',
        assignee,
        due_date: parsed.date_echeance
      },
      changes,
      ...(note ? { note } : {})
    }
  } else if (parsed.operation === 'complete_action') {
    if (action.task.state !== 'open') {
      throw new ActivitiesError('Only open actions can be completed', 'forbidden')
    }
    type = 'task.completed'
    next = {
      version: 2,
      task: { ...action.task, state: 'completed' },
      ...(parsed.resultat?.trim() ? { result: parsed.resultat.trim() } : {})
    }
  } else if (parsed.operation === 'reopen_action') {
    if (action.task.state !== 'completed') {
      throw new ActivitiesError('Only completed actions can be reopened', 'forbidden')
    }
    const nextAssignee = resolve_destinataire(parsed.assigne_a, org_email_index(db))
    if (!nextAssignee) throw new ActivitiesError('Unknown assignee')
    const assignee = assignee_ref(nextAssignee)
    type = 'task.reopened'
    next = {
      version: 2,
      task: {
        title: action.task.title,
        state: 'open',
        assignee,
        due_date: parsed.date_echeance
      },
      ...(parsed.note?.trim()
        ? { note: parsed.note.trim() }
        : action.note
          ? { note: action.note }
          : {})
    }
  } else {
    if (action.task.state !== 'open') {
      throw new ActivitiesError('Only open actions can be ignored', 'forbidden')
    }
    type = 'task.ignored'
    next = {
      version: 2,
      task: { ...action.task, state: 'ignored' },
      ...(parsed.motif?.trim() ? { reason: parsed.motif.trim() } : {})
    }
  }

  const assignmentEvent = type === 'task.updated' || type === 'task.reopened'
  const mentions =
    assignmentEvent && next.task.assignee
      ? build_mentions(db, JSON.stringify(next), [next.task.assignee.id]).map((mention) =>
          mention.destinataire === next.task.assignee?.id
            ? { ...mention, motif: 'assignation' as const }
            : mention
        )
      : []
  return insert_task_event(db, {
    date_creation: now,
    rattachement: latest.rattachement,
    auteur: actorDestinataire,
    facets: {
      id_client: latest.id_client,
      id_locataire: latest.id_locataire,
      id_lot: latest.id_lot
    },
    contenu: next,
    thread_id: latest.thread_id!,
    type,
    revision: latest.revision! + 1,
    mentions
  })
}
