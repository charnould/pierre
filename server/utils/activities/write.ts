import { Database } from 'bun:sqlite'

import {
  type Activite,
  type ActivityPatch,
  type TaskContent,
  activity_timestamp,
  entity_ref,
  is_activity_meta_type,
  is_communication_type,
  is_note_type,
  is_task_type,
  parse_activity_meta_content,
  parse_note_content,
  parse_task_content,
  parse_titled_content
} from '../../../shared/activites'
import { insert_task_event, patch_action } from './action'
import {
  create_repayment_plan,
  is_repayment_plan_row,
  transition_repayment_plan
} from './repayment-plan-write'
import {
  build_mentions,
  datastore_path,
  get_activity_with_db,
  insert_activity_row,
  merge_mentions_from_content,
  normalize_activity_content,
  org_email_index,
  resolve_activity_facets,
  resolve_destinataire,
  type ActivityDbRow,
  user_destinataire
} from './rows'
import {
  ActivitiesError,
  ActivityPatchInput,
  AUTHOR_RE,
  CreateActivityInput,
  TrustedCreateActivityInput
} from './schema'

const latest_thread_revision = (db: Database, thread_id: string): number => {
  const row = db
    .query<{ revision: number | null }, [string]>(
      'SELECT MAX(revision) AS revision FROM activites WHERE thread_id = ?'
    )
    .get(thread_id)
  return row?.revision ?? 0
}

const require_current_artifact = (db: Database, activity: Activite): void => {
  if (!activity.type.startsWith('artifact.') || !activity.thread_id) return
  const latest = db
    .query<{ id: number; type: string }, [string]>(
      `SELECT id, type FROM activites
       WHERE thread_id = ?
       ORDER BY revision DESC, id DESC
       LIMIT 1`
    )
    .get(activity.thread_id)
  if (
    latest?.id !== activity.id ||
    latest.type === 'artifact.discarded' ||
    latest.type === 'artifact.finalized'
  ) {
    throw new ActivitiesError('Artifact revision conflict', 'conflict')
  }
}

const append = (db: Database, values: Parameters<typeof insert_activity_row>[1]): Activite => {
  try {
    return insert_activity_row(db, values)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('UNIQUE') && values.idempotency_key) {
      throw new ActivitiesError('Activity already exists for this treatment', 'conflict')
    }
    throw error
  }
}

const create_activity_internal = (
  actor: string,
  input: CreateActivityInput & {
    bulk_id?: string | null
    execution_id?: string | null
  },
  options: { trusted_author?: string; date_creation?: string } = {},
  existing_db?: Database
): Activite => {
  const parsed = input
  if (is_activity_meta_type(parsed.type)) {
    throw new ActivitiesError('Cannot create this event directly', 'forbidden')
  }
  if (is_communication_type(parsed.type)) {
    throw new ActivitiesError('Communications require a dedicated endpoint', 'forbidden')
  }
  const actorEmail = actor.trim().toLowerCase()
  const author = options.trusted_author ?? user_destinataire(actorEmail)
  if (!AUTHOR_RE.test(author)) throw new ActivitiesError('Invalid author')
  if (
    !options.trusted_author &&
    author.startsWith('user:') &&
    author !== user_destinataire(actorEmail)
  ) {
    throw new ActivitiesError('Author must match authenticated user', 'forbidden')
  }

  const db = existing_db ?? new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const perform = (): Activite => {
      const facets = resolve_activity_facets(db, parsed.contexte, parsed.ref)
      const date_creation = options.date_creation ?? activity_timestamp()
      const rattachement = `${parsed.contexte}:${parsed.ref.trim()}`
      const destinataire = parsed.destinataire ?? null
      const bulk_id = parsed.bulk_id ?? null
      const execution_id = parsed.execution_id ?? null
      const idempotency_key = parsed.idempotency_key ?? null

      if (is_task_type(parsed.type)) {
        const creation = parse_task_content(parsed.contenu)
        if (!creation) throw new ActivitiesError('Invalid action content')
        if (parsed.type !== 'task.created' && parsed.type !== 'task.completed') {
          throw new ActivitiesError('Only task.created or task.completed can be created')
        }
        const assigneeId = creation.task.assignee
          ? resolve_destinataire(creation.task.assignee.id, org_email_index(db))
          : null
        if (creation.task.state === 'open' && !assigneeId) {
          throw new ActivitiesError('Open actions require a known assignee')
        }
        const dueDate = creation.task.due_date?.trim()
        if (creation.task.state === 'open' && !dueDate) {
          throw new ActivitiesError('Open actions require a due date')
        }
        const assignee = assigneeId
          ? entity_ref(assigneeId, creation.task.assignee?.label ?? assigneeId)
          : undefined
        const content: TaskContent = {
          version: 2,
          task: {
            title: creation.task.title,
            state: parsed.type === 'task.completed' ? 'completed' : 'open',
            ...(assignee ? { assignee } : {}),
            ...(dueDate ? { due_date: dueDate } : {})
          },
          ...(creation.note ? { note: creation.note } : {}),
          ...(creation.result ? { result: creation.result } : {})
        }
        const mentions = build_mentions(db, JSON.stringify(content), [
          ...(parsed.recipients ?? []),
          ...(assignee && content.task.state === 'open' ? [assignee.id] : [])
        ]).map((mention) =>
          mention.destinataire === assignee?.id
            ? { ...mention, motif: 'assignation' as const }
            : mention
        )
        return insert_task_event(db, {
          date_creation,
          rattachement,
          auteur: author,
          facets,
          contenu: content,
          thread_id: parsed.thread_id ?? Bun.randomUUIDv7(),
          type: parsed.type === 'task.completed' ? 'task.completed' : 'task.created',
          revision: 1,
          mentions,
          idempotency_key
        })
      }

      if (parsed.type.startsWith('repayment_plan.')) {
        if (
          parsed.type !== 'repayment_plan.created' &&
          parsed.type !== 'repayment_plan.finalized'
        ) {
          throw new ActivitiesError('This repayment plan event requires an existing plan')
        }
        if (parsed.thread_id) {
          throw new ActivitiesError('Repayment plan thread is assigned by the server')
        }
        const contenu = normalize_activity_content(parsed.type, parsed.contenu)
        const mentions = build_mentions(db, contenu, parsed.recipients ?? [])
        return create_repayment_plan(db, {
          date_creation,
          rattachement,
          auteur: author,
          facets,
          mentions,
          type: parsed.type,
          contenu,
          idempotency_key
        })
      }

      const contenu = normalize_activity_content(parsed.type, parsed.contenu)
      const mentions = build_mentions(db, contenu, parsed.recipients ?? [])
      const needsThread =
        is_note_type(parsed.type) ||
        parsed.type.startsWith('document.') ||
        parsed.type.startsWith('artifact.')
      const thread_id = needsThread
        ? (parsed.thread_id ?? Bun.randomUUIDv7())
        : (parsed.thread_id ?? null)
      const revision = thread_id ? latest_thread_revision(db, thread_id) + 1 : null

      return append(db, {
        date_creation,
        rattachement,
        auteur: author,
        destinataire,
        facets,
        type: parsed.type,
        channel: parsed.channel ?? null,
        mentions,
        contenu,
        thread_id,
        revision,
        bulk_id,
        execution_id,
        idempotency_key
      })
    }
    return existing_db ? perform() : db.transaction(perform).immediate()
  } finally {
    if (!existing_db) db.close()
  }
}

export const create_activity = (actor: string, input: CreateActivityInput): Activite =>
  create_activity_internal(actor, CreateActivityInput.parse(input))

export const create_trusted_activity = (
  actor: string,
  input: TrustedCreateActivityInput
): Activite => {
  const parsed = TrustedCreateActivityInput.parse(input)
  const { auteur, date_creation, ...activity } = parsed
  return create_activity_internal(actor, activity, {
    ...(auteur ? { trusted_author: auteur } : {}),
    ...(date_creation ? { date_creation } : {})
  })
}

const can_edit = (activity: Activite, actor: string): boolean =>
  activity.auteur === user_destinataire(actor)

const latest_reaction = (db: Database, sourceId: number, auteur: string): string | null => {
  const row = db
    .query<ActivityDbRow, [string, number]>(
      `SELECT * FROM activites
       WHERE type = 'activity.reaction_changed' AND auteur = ?
         AND json_extract(contenu, '$.source_activity_id') = ?
       ORDER BY date_creation DESC, id DESC`
    )
    .get(auteur, sourceId)
  if (!row) return null
  return parse_activity_meta_content(row.contenu)?.emoji ?? null
}

const latest_receipt = (
  db: Database,
  sourceId: number,
  auteur: string
): 'activity.read' | 'activity.unread' | null => {
  const row = db
    .query<Pick<ActivityDbRow, 'type'>, [string, number]>(
      `SELECT type FROM activites
       WHERE type IN ('activity.read', 'activity.unread') AND auteur = ?
         AND json_extract(contenu, '$.source_activity_id') = ?
       ORDER BY date_creation DESC, id DESC`
    )
    .get(auteur, sourceId)
  if (row?.type === 'activity.read' || row?.type === 'activity.unread') return row.type
  return null
}

export const patch_activity = (actor: string, id: number, patch: ActivityPatch): Activite => {
  const parsed = ActivityPatchInput.parse(patch)
  const destinataire = user_destinataire(actor)
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const apply_patch = (): Activite => {
      const existing = get_activity_with_db(db, id)
      if (!existing) throw new ActivitiesError('Activity not found', 'not_found')

      if (parsed.operation === 'set_boost') {
        const emoji = parsed.emoji?.trim() ? parsed.emoji.trim() : null
        if (existing.auteur === destinataire) {
          throw new ActivitiesError('Cannot boost own activity', 'forbidden')
        }
        if (!existing.auteur.startsWith('user:')) {
          throw new ActivitiesError('Only collaborator actions can be boosted', 'forbidden')
        }
        if ((latest_reaction(db, existing.id, destinataire) ?? null) === emoji) {
          return existing
        }
        return append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: 'activity.reaction_changed',
          mentions: [{ destinataire: existing.auteur }],
          contenu: JSON.stringify({
            version: 2,
            source_activity_id: existing.id,
            ...(emoji ? { emoji } : {})
          })
        })
      }

      if (is_communication_type(existing.type)) {
        throw new ActivitiesError('Communications are immutable', 'forbidden')
      }

      if (parsed.operation === 'set_mention') {
        const current = existing.mentions.find((mention) => mention.destinataire === destinataire)
        if (!current) throw new ActivitiesError('Actor is not mentioned', 'forbidden')
        if (parsed.lu === undefined) return existing
        const nextType = parsed.lu ? 'activity.read' : 'activity.unread'
        if (latest_receipt(db, existing.id, destinataire) === nextType) return existing
        return append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: nextType,
          mentions: [],
          contenu: JSON.stringify({ version: 2, source_activity_id: existing.id })
        })
      }

      const actionResult = patch_action(db, actor, existing, parsed)
      if (actionResult) return actionResult

      if (parsed.operation === 'withdraw_note') {
        if (!is_note_type(existing.type) || existing.auteur !== destinataire) {
          throw new ActivitiesError('Forbidden', 'forbidden')
        }
        if (!existing.thread_id) throw new ActivitiesError('Invalid note', 'invalid_body')
        return append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: 'note.withdrawn',
          mentions: [],
          contenu: JSON.stringify({ version: 2 }),
          thread_id: existing.thread_id,
          revision: latest_thread_revision(db, existing.thread_id) + 1
        })
      }

      if (!can_edit(existing, actor) && !existing.type.startsWith('artifact.')) {
        throw new ActivitiesError('Forbidden', 'forbidden')
      }
      require_current_artifact(db, existing)

      if (is_repayment_plan_row(existing)) {
        if (parsed.operation === 'save_repayment_plan') {
          return transition_repayment_plan(db, {
            existing,
            auteur: destinataire,
            operation: 'save',
            contenu: parsed.contenu
          })
        }
        if (parsed.operation === 'finalize_repayment_plan') {
          return transition_repayment_plan(db, {
            existing,
            auteur: destinataire,
            operation: 'finalize',
            contenu: parsed.contenu
          })
        }
        if (parsed.operation === 'close_repayment_plan') {
          return transition_repayment_plan(db, {
            existing,
            auteur: destinataire,
            operation: 'close',
            reason: parsed.reason
          })
        }
        throw new ActivitiesError('Invalid repayment plan operation', 'forbidden')
      }

      if (parsed.operation === 'edit_content') {
        if (existing.type.startsWith('artifact.')) {
          const current = parse_titled_content(existing.contenu)
          if (!current) throw new ActivitiesError('Invalid artifact content')
          const values = current.values ?? {}
          const generatedOutput =
            typeof values['edited_by'] === 'string' ? values['generated_output'] : current.note
          return append(db, {
            date_creation: activity_timestamp(),
            rattachement: existing.rattachement,
            auteur: destinataire,
            facets: {
              id_client: existing.id_client,
              id_locataire: existing.id_locataire,
              id_lot: existing.id_lot
            },
            type: 'artifact.regenerated',
            mentions: [],
            contenu: JSON.stringify({
              version: 2,
              title: current.title,
              values: {
                ...values,
                generated_output: generatedOutput ?? null,
                edited_by: actor,
                edited_at: activity_timestamp()
              },
              note: parsed.contenu
            }),
            thread_id: existing.thread_id ?? Bun.randomUUIDv7(),
            revision: existing.thread_id ? latest_thread_revision(db, existing.thread_id) + 1 : 1
          })
        }
        if (is_note_type(existing.type)) {
          const incoming = parse_note_content(parsed.contenu)
          if (!incoming) throw new ActivitiesError('Invalid note content')
          if (!existing.thread_id) throw new ActivitiesError('Invalid note', 'invalid_body')
          const contenu = JSON.stringify({ version: 2, text: incoming.text ?? '' })
          return append(db, {
            date_creation: activity_timestamp(),
            rattachement: existing.rattachement,
            auteur: destinataire,
            facets: {
              id_client: existing.id_client,
              id_locataire: existing.id_locataire,
              id_lot: existing.id_lot
            },
            type: 'note.updated',
            mentions: merge_mentions_from_content(db, contenu, existing.mentions),
            contenu,
            thread_id: existing.thread_id,
            revision: latest_thread_revision(db, existing.thread_id) + 1
          })
        }
        throw new ActivitiesError('This activity cannot be edited', 'forbidden')
      }

      if (parsed.operation === 'set_evaluation') {
        const current = parse_titled_content(existing.contenu)
        if (!current || !existing.type.startsWith('artifact.')) {
          throw new ActivitiesError('This activity cannot be evaluated', 'forbidden')
        }
        const values = current.values ?? {}
        return append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: 'artifact.feedback_recorded',
          mentions: [],
          contenu: JSON.stringify({
            version: 2,
            title: current.title,
            values: {
              ...values,
              feedback_rating: parsed.score,
              feedback_comment: parsed.commentaire ?? null,
              feedback_by: actor,
              feedback_at: activity_timestamp()
            },
            ...(current.note != null ? { note: current.note } : {})
          }),
          thread_id: existing.thread_id ?? Bun.randomUUIDv7(),
          revision: existing.thread_id ? latest_thread_revision(db, existing.thread_id) + 1 : 1
        })
      }

      throw new ActivitiesError('Invalid patch operation')
    }
    return db.transaction(apply_patch).immediate()
  } finally {
    db.close()
  }
}

export const delete_activity = (actor: string, id: number): void => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const remove = () => {
      const existing = get_activity_with_db(db, id)
      if (!existing) throw new ActivitiesError('Activity not found', 'not_found')
      if (is_communication_type(existing.type)) {
        throw new ActivitiesError('Communications cannot be deleted', 'forbidden')
      }
      const destinataire = user_destinataire(actor)
      if (
        is_repayment_plan_row(existing) &&
        existing.auteur === destinataire &&
        existing.thread_id
      ) {
        transition_repayment_plan(db, {
          existing,
          auteur: destinataire,
          operation: 'withdraw'
        })
        return
      }
      if (is_note_type(existing.type) && existing.auteur === destinataire && existing.thread_id) {
        append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: 'note.withdrawn',
          mentions: [],
          contenu: JSON.stringify({ version: 2 }),
          thread_id: existing.thread_id,
          revision: latest_thread_revision(db, existing.thread_id) + 1
        })
        return
      }
      if (is_task_type(existing.type) && existing.thread_id) {
        const created = db
          .query<{ auteur: string }, [string]>(
            `SELECT auteur FROM activites WHERE thread_id = ? AND type = 'task.created' LIMIT 1`
          )
          .get(existing.thread_id)
        if (created?.auteur !== destinataire) throw new ActivitiesError('Forbidden', 'forbidden')
        const task = parse_task_content(existing.contenu)
        if (!task) throw new ActivitiesError('Invalid action content', 'invalid_body')
        append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: 'task.deleted',
          mentions: [],
          contenu: JSON.stringify({
            version: 2,
            task: { ...task.task, state: 'deleted' }
          }),
          thread_id: existing.thread_id,
          revision: latest_thread_revision(db, existing.thread_id) + 1
        })
        return
      }
      if (existing.type.startsWith('artifact.')) {
        require_current_artifact(db, existing)
        const current = parse_titled_content(existing.contenu)
        if (!current) throw new ActivitiesError('Invalid artifact content')
        const thread_id = existing.thread_id ?? Bun.randomUUIDv7()
        append(db, {
          date_creation: activity_timestamp(),
          rattachement: existing.rattachement,
          auteur: destinataire,
          facets: {
            id_client: existing.id_client,
            id_locataire: existing.id_locataire,
            id_lot: existing.id_lot
          },
          type: 'artifact.discarded',
          mentions: [],
          contenu: JSON.stringify(current),
          thread_id,
          revision: existing.thread_id ? latest_thread_revision(db, existing.thread_id) + 1 : 1
        })
        return
      }
      throw new ActivitiesError('Forbidden', 'forbidden')
    }
    db.transaction(remove).immediate()
  } finally {
    db.close()
  }
}
