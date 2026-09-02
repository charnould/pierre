import { Database, type SQLQueryBindings } from 'bun:sqlite'

import {
  ACTIVITY_CONTENT_VERSION,
  type ActionActivityContent,
  type ActionActivityEvent,
  type ActionActivityState,
  type Activite,
  type ActivityPatch,
  type ActivityStatus,
  type Mention,
  activity_timestamp,
  parse_action_activity_content
} from '../../../shared/activites'
import {
  build_mentions,
  org_email_index,
  resolve_destinataire,
  row_to_activity,
  type ActivityDbRow,
  type ActivityFacets,
  user_destinataire
} from './rows'
import { ActivitiesError } from './schema'

export function insert_action_event(
  db: Database,
  values: {
    date_creation: string
    rattachement: string
    auteur: string
    facets: ActivityFacets
    contenu: ActionActivityContent
    thread_id: string
    event: ActionActivityEvent
    state: ActionActivityState
    revision: number
    mentions: Mention[]
    statut?: ActivityStatus | null
    idempotency_key?: string | null
  }
): Activite {
  const row = db
    .query<ActivityDbRow, SQLQueryBindings[]>(
      `INSERT INTO activites (
         date_creation, date_statut, rattachement, auteur, destinataire,
         id_client, id_locataire, id_lot,
         type, statut, mentions, contenu, thread_id, event, state, revision,
         idempotency_key
       ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'action', ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .get(
      values.date_creation,
      values.date_creation,
      values.rattachement,
      values.auteur,
      values.facets.id_client,
      values.facets.id_locataire,
      values.facets.id_lot,
      values.statut ?? null,
      JSON.stringify(values.mentions),
      JSON.stringify(values.contenu),
      values.thread_id,
      values.event,
      values.state,
      values.revision,
      values.idempotency_key ?? null
    )
  if (!row) throw new ActivitiesError('Failed to create action event')
  return row_to_activity(row)
}

export const patch_action = (
  db: Database,
  actor: string,
  existing: Activite,
  parsed: ActivityPatch
): Activite | null => {
  if (
    parsed.operation === 'update_action' ||
    parsed.operation === 'complete_action' ||
    parsed.operation === 'reopen_action' ||
    parsed.operation === 'ignore_action'
  ) {
    if (existing.type !== 'action') {
      throw new ActivitiesError('Activity is not an action', 'invalid_body')
    }
    if (!existing.thread_id || existing.revision == null) {
      throw new ActivitiesError('Invalid action event', 'invalid_body')
    }

    const latestRow = db
      .query<ActivityDbRow, [string]>(
        `SELECT * FROM activites
             WHERE type = 'action' AND thread_id = ?
             ORDER BY revision DESC LIMIT 1`
      )
      .get(existing.thread_id)
    if (!latestRow) throw new ActivitiesError('Action thread not found', 'not_found')
    const latest = row_to_activity(latestRow)
    if (latest.id !== existing.id) {
      throw new ActivitiesError('Action changed since it was loaded', 'conflict')
    }
    const action = parse_action_activity_content(latest.contenu)
    if (!action) throw new ActivitiesError('Invalid action content', 'invalid_body')

    const actorDestinataire = user_destinataire(actor)
    const assignee = action.assigne_a ?? null
    const isAssignee = assignee === actorDestinataire
    const isCreator = action.cree_par === actorDestinataire
    const now = activity_timestamp()
    let event: ActionActivityEvent
    let state: ActionActivityState
    let nextAction: ActionActivityContent

    if (parsed.operation === 'update_action') {
      if (!isCreator && !isAssignee) throw new ActivitiesError('Forbidden', 'forbidden')
      if (latest.state !== 'a_faire') {
        throw new ActivitiesError('Only open actions can be edited', 'forbidden')
      }
      const nextAssignee = resolve_destinataire(parsed.assigne_a, org_email_index(db))
      if (!nextAssignee) throw new ActivitiesError('Unknown assignee')
      event = 'updated'
      state = 'a_faire'
      nextAction = {
        version: ACTIVITY_CONTENT_VERSION,
        action: parsed.action,
        etat: state,
        cree_par: action.cree_par,
        cree_le: action.cree_le,
        assigne_a: nextAssignee,
        date_echeance: parsed.date_echeance,
        ...(parsed.note?.trim() ? { note: parsed.note.trim() } : {})
      }
    } else if (parsed.operation === 'complete_action') {
      if (latest.state !== 'a_faire') {
        throw new ActivitiesError('Only open actions can be completed', 'forbidden')
      }
      event = 'completed'
      state = 'fait'
      nextAction = {
        ...action,
        etat: state,
        ...(parsed.resultat?.trim() ? { resultat: parsed.resultat.trim() } : {}),
        motif: undefined
      }
    } else if (parsed.operation === 'reopen_action') {
      if (latest.state !== 'fait') {
        throw new ActivitiesError('Only completed actions can be reopened', 'forbidden')
      }
      const nextAssignee = resolve_destinataire(parsed.assigne_a, org_email_index(db))
      if (!nextAssignee) throw new ActivitiesError('Unknown assignee')
      event = 'reopened'
      state = 'a_faire'
      nextAction = {
        version: ACTIVITY_CONTENT_VERSION,
        action: action.action,
        etat: state,
        cree_par: action.cree_par,
        cree_le: action.cree_le,
        assigne_a: nextAssignee,
        date_echeance: parsed.date_echeance,
        ...(parsed.note?.trim()
          ? { note: parsed.note.trim() }
          : action.note
            ? { note: action.note }
            : {})
      }
    } else {
      if (latest.state !== 'a_faire') {
        throw new ActivitiesError('Only open actions can be ignored', 'forbidden')
      }
      event = 'ignored'
      state = 'ignore'
      nextAction = {
        ...action,
        etat: state,
        resultat: undefined,
        ...(parsed.motif?.trim() ? { motif: parsed.motif.trim() } : {})
      }
    }

    const assignmentEvent = event === 'updated' || event === 'reopened'
    const mentions =
      assignmentEvent && nextAction.assigne_a
        ? build_mentions(db, JSON.stringify(nextAction), [nextAction.assigne_a]).map((mention) =>
            mention.destinataire === nextAction.assigne_a
              ? { ...mention, motif: 'assignation' as const }
              : mention
          )
        : []
    const appended = insert_action_event(db, {
      date_creation: now,
      rattachement: latest.rattachement,
      auteur: actorDestinataire,
      facets: {
        id_client: latest.id_client,
        id_locataire: latest.id_locataire,
        id_lot: latest.id_lot
      },
      contenu: nextAction,
      thread_id: latest.thread_id!,
      event,
      state,
      revision: latest.revision! + 1,
      mentions,
      statut: latest.statut
    })
    return appended
  }
  return null
}
