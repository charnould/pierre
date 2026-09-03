import { Database, type SQLQueryBindings } from 'bun:sqlite'

import {
  ACTIVITY_CONTENT_VERSION,
  type ActionActivityContent,
  type Activite,
  type ActivityPatch,
  type Mention,
  activity_timestamp,
  is_boost_notification,
  mention_of,
  parse_action_activity_content,
  parse_action_creation_content,
  parse_contenu_json,
  parse_message_activity_content
} from '../../../shared/activites'
import { insert_action_event, patch_action } from './action'
import { latest_repayment_states } from './repayment'
import {
  build_mentions,
  build_rattachement,
  datastore_path,
  get_activity_with_db,
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
  TrustedCreateActivityInput,
  is_communication_type
} from './schema'

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
  if (is_boost_notification(parsed.type)) {
    throw new ActivitiesError('Cannot create boost notifications directly', 'forbidden')
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
      const rattachement = build_rattachement(parsed.contexte, parsed.ref)
      let contenu = normalize_activity_content(parsed.type, parsed.contenu)
      const date_statut = date_creation
      const destinataire = parsed.destinataire ?? null
      const bulk_id = parsed.bulk_id ?? null
      const execution_id = parsed.execution_id ?? null
      const idempotency_key = parsed.idempotency_key ?? null

      if (parsed.type === 'action') {
        if (parsed.statut === 'draft') {
          throw new ActivitiesError('Actions cannot be drafts')
        }
        const creation = parse_action_creation_content(contenu)
        if (!creation) throw new ActivitiesError('Invalid action content')
        const assignee = creation.assigne_a
          ? resolve_destinataire(creation.assigne_a, org_email_index(db))
          : null
        if (creation.etat === 'a_faire' && !assignee) {
          throw new ActivitiesError('Open actions require a known assignee')
        }
        const actionContent: ActionActivityContent = {
          version: ACTIVITY_CONTENT_VERSION,
          action: creation.action,
          etat: creation.etat,
          cree_par: author,
          cree_le: date_creation,
          ...(assignee ? { assigne_a: assignee } : {}),
          ...(creation.date_echeance ? { date_echeance: creation.date_echeance } : {}),
          ...(creation.note ? { note: creation.note } : {}),
          ...(creation.resultat ? { resultat: creation.resultat } : {})
        }
        contenu = JSON.stringify(actionContent)
        const mentions = build_mentions(db, contenu, [
          ...(parsed.recipients ?? []),
          ...(assignee && creation.etat === 'a_faire' ? [assignee] : [])
        ]).map((mention) =>
          mention.destinataire === assignee
            ? { ...mention, motif: 'assignation' as const }
            : mention
        )
        try {
          return insert_action_event(db, {
            date_creation,
            rattachement,
            auteur: author,
            facets,
            contenu: actionContent,
            thread_id: Bun.randomUUIDv7(),
            event: creation.etat === 'fait' ? 'completed' : 'created',
            state: creation.etat,
            revision: 1,
            mentions,
            statut: parsed.statut,
            idempotency_key
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (message.includes('UNIQUE') && idempotency_key) {
            throw new ActivitiesError('Activity already exists for this treatment', 'conflict')
          }
          throw error
        }
      }

      const recipients = [...(parsed.recipients ?? [])]
      if (
        parsed.contexte === 'repayment' &&
        (parsed.type === 'email' || parsed.type === 'rcs') &&
        author.startsWith('tenant:')
      ) {
        const tenantId = facets.id_locataire ?? parsed.ref
        const email = latest_repayment_states(db, [tenantId]).get(tenantId)?.gestionnaire_email
        if (email) recipients.push(email)
      }
      const mentions = build_mentions(
        db,
        is_boost_notification(parsed.type) ? '' : contenu,
        recipients
      )
      const currentDraft =
        parsed.statut === 'draft'
          ? db
              .query<{ id: number }, [string, string]>(
                `SELECT id FROM activites
               WHERE rattachement = ? AND type = ? AND statut = 'draft'
               ORDER BY date_creation DESC, id DESC LIMIT 1`
              )
              .get(rattachement, parsed.type)
          : null
      if (currentDraft) {
        db.run(
          `UPDATE activites
         SET date_creation = ?, auteur = ?, id_client = ?, id_locataire = ?, id_lot = ?,
             date_statut = ?, destinataire = ?, mentions = ?, contenu = ?,
             bulk_id = ?, execution_id = ?, idempotency_key = ?
         WHERE id = ?`,
          [
            date_creation,
            author,
            facets.id_client,
            facets.id_locataire,
            facets.id_lot,
            date_statut,
            destinataire,
            JSON.stringify(mentions),
            contenu,
            bulk_id,
            execution_id,
            idempotency_key,
            currentDraft.id
          ]
        )
        return {
          id: Number(currentDraft.id),
          date_creation,
          date_statut,
          rattachement,
          auteur: author,
          destinataire,
          ...facets,
          type: parsed.type,
          statut: 'draft',
          mentions,
          contenu,
          thread_id: null,
          event: null,
          state: null,
          revision: null,
          bulk_id,
          execution_id,
          idempotency_key
        }
      }
      let inserted: { id: number } | null = null
      try {
        inserted = db
          .query<{ id: number }, SQLQueryBindings[]>(
            `INSERT INTO activites (
             date_creation, date_statut, rattachement, auteur, destinataire,
             id_client, id_locataire, id_lot,
             type, statut, mentions, contenu, bulk_id, execution_id, idempotency_key
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING id`
          )
          .get(
            date_creation,
            date_statut,
            rattachement,
            author,
            destinataire,
            facets.id_client,
            facets.id_locataire,
            facets.id_lot,
            parsed.type,
            parsed.statut ?? null,
            JSON.stringify(mentions),
            contenu,
            bulk_id,
            execution_id,
            idempotency_key
          )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('UNIQUE') && idempotency_key) {
          throw new ActivitiesError('Activity already exists for this treatment', 'conflict')
        }
        throw error
      }
      return {
        id: Number(inserted?.id),
        date_creation,
        date_statut,
        rattachement,
        auteur: author,
        destinataire,
        ...facets,
        type: parsed.type,
        statut: parsed.statut ?? null,
        mentions,
        contenu,
        thread_id: null,
        event: null,
        state: null,
        revision: null,
        bulk_id,
        execution_id,
        idempotency_key
      }
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

export const create_trusted_activity_with_db = (
  db: Database,
  actor: string,
  input: TrustedCreateActivityInput
): Activite => {
  const parsed = TrustedCreateActivityInput.parse(input)
  const { auteur, date_creation, ...activity } = parsed
  return create_activity_internal(
    actor,
    activity,
    {
      ...(auteur ? { trusted_author: auteur } : {}),
      ...(date_creation ? { date_creation } : {})
    },
    db
  )
}

const can_edit = (activity: Activite, actor: string): boolean =>
  activity.auteur === user_destinataire(actor) || activity.statut === 'draft'

const apply_source_boost = (
  mentions: Mention[],
  destinataire: string,
  emoji: string | null
): Mention[] => {
  const current = mention_of(mentions, destinataire)
  if (emoji) {
    if (!current) {
      return [...mentions, { destinataire, lu: true, boost: emoji, inbox: false }]
    }
    return mentions.map((mention) =>
      mention.destinataire === destinataire ? { ...current, boost: emoji } : mention
    )
  }
  if (!current) return mentions
  if (current.inbox === false) {
    return mentions.filter((mention) => mention.destinataire !== destinataire)
  }
  return mentions.map((mention) =>
    mention.destinataire === destinataire ? { ...current, boost: null } : mention
  )
}

const upsert_boost_notification = (
  db: Database,
  auteur: string,
  source: Activite,
  emoji: string | null
): void => {
  const rows = db
    .query<ActivityDbRow, [string, string]>(
      `SELECT * FROM activites
       WHERE type = 'activity_boost' AND auteur = ? AND rattachement = ?`
    )
    .all(auteur, source.rattachement)
  const match =
    rows.find(
      (row) => Number(parse_contenu_json(row.contenu)['activite_source_id']) === source.id
    ) ?? null

  if (!emoji) {
    if (match) db.run('DELETE FROM activites WHERE id = ?', [match.id])
    return
  }

  const contenu = JSON.stringify({
    version: 1,
    activite_source_id: source.id,
    type_activite_source: source.type,
    emoji
  })
  const authorMentions = JSON.stringify([{ destinataire: source.auteur, lu: false, boost: null }])
  const date_creation = activity_timestamp()

  if (match) {
    db.run('UPDATE activites SET date_creation = ?, mentions = ?, contenu = ? WHERE id = ?', [
      date_creation,
      authorMentions,
      contenu,
      match.id
    ])
    return
  }

  db.run(
    `INSERT INTO activites (
       date_creation, rattachement, auteur, id_client, id_locataire, id_lot,
       type, statut, mentions, contenu
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      date_creation,
      source.rattachement,
      auteur,
      source.id_client,
      source.id_locataire,
      source.id_lot,
      'activity_boost',
      'logged',
      authorMentions,
      contenu
    ]
  )
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
        if (is_boost_notification(existing.type)) {
          throw new ActivitiesError('Boost notifications cannot be boosted', 'forbidden')
        }
        if (existing.auteur === destinataire) {
          throw new ActivitiesError('Cannot boost own activity', 'forbidden')
        }
        if (!existing.auteur.startsWith('user:')) {
          throw new ActivitiesError('Only collaborator actions can be boosted', 'forbidden')
        }
        const mentions = apply_source_boost(existing.mentions, destinataire, emoji)
        db.run('UPDATE activites SET mentions = ? WHERE id = ?', [JSON.stringify(mentions), id])
        upsert_boost_notification(db, destinataire, existing, emoji)
        return { ...existing, mentions }
      }

      if (is_communication_type(existing.type)) {
        throw new ActivitiesError('Communications are immutable', 'forbidden')
      }

      if (parsed.operation === 'set_mention') {
        const current = mention_of(existing.mentions, destinataire)
        if (!current) throw new ActivitiesError('Actor is not mentioned', 'forbidden')
        const mentions = existing.mentions.map((mention) =>
          mention.destinataire === destinataire
            ? {
                ...current,
                lu: parsed.lu ?? current.lu,
                boost: parsed.boost === undefined ? current.boost : parsed.boost
              }
            : mention
        )
        db.run('UPDATE activites SET mentions = ? WHERE id = ?', [JSON.stringify(mentions), id])
        return { ...existing, mentions }
      }

      const actionResult = patch_action(db, actor, existing, parsed)
      if (actionResult) return actionResult

      if (parsed.operation === 'withdraw_note') {
        if (existing.type !== 'note' || existing.auteur !== destinataire) {
          throw new ActivitiesError('Forbidden', 'forbidden')
        }
        const message = parse_message_activity_content(existing.contenu)
        if (!message) throw new ActivitiesError('Invalid note content', 'invalid_body')
        const nextContenu = JSON.stringify({
          version: message.version,
          note: '',
          etat: 'retire',
          date_retrait: activity_timestamp(),
          retire_par: destinataire
        })
        db.run('UPDATE activites SET contenu = ?, mentions = ? WHERE id = ?', [
          nextContenu,
          '[]',
          id
        ])
        return { ...existing, contenu: nextContenu, mentions: [] }
      }

      if (
        parsed.operation === 'edit_content' &&
        existing.type === 'repayment_plan' &&
        parse_contenu_json(existing.contenu)['etat'] === 'signe'
      ) {
        throw new ActivitiesError('Signed plans are immutable', 'forbidden')
      }

      if (!can_edit(existing, actor)) throw new ActivitiesError('Forbidden', 'forbidden')

      if (parsed.operation === 'set_status') {
        const date_statut = activity_timestamp()
        db.run('UPDATE activites SET statut = ?, date_statut = ? WHERE id = ?', [
          parsed.statut,
          date_statut,
          id
        ])
        return { ...existing, statut: parsed.statut, date_statut }
      }

      const existingPayload = parse_contenu_json(existing.contenu)

      let nextContenu: string
      let nextMentions: Mention[] | null = null
      if (parsed.operation === 'edit_content') {
        const incoming = parse_contenu_json(
          normalize_activity_content(existing.type, parsed.contenu)
        )
        if (Object.keys(incoming).length > 0) {
          const metadata: Record<string, unknown> = { ...existingPayload, ...incoming }
          metadata['edition'] = { par: user_destinataire(actor), le: activity_timestamp() }
          nextContenu = JSON.stringify(metadata)
          if (existing.type === 'note') {
            nextMentions = merge_mentions_from_content(db, nextContenu, existing.mentions)
          }
        } else {
          const metadata = { ...existingPayload }
          metadata['contenu'] = parsed.contenu
          if (parsed.titre !== undefined) metadata['titre'] = parsed.titre
          metadata['edition'] = { par: user_destinataire(actor), le: activity_timestamp() }
          nextContenu = JSON.stringify(metadata)
        }
      } else if (parsed.operation === 'set_evaluation') {
        const evaluation =
          parsed.score === null && !parsed.commentaire
            ? null
            : {
                score: parsed.score,
                commentaire: parsed.commentaire ?? null,
                par: user_destinataire(actor),
                le: activity_timestamp()
              }
        nextContenu = JSON.stringify({ ...existingPayload, evaluation })
      } else {
        throw new ActivitiesError('Invalid patch operation')
      }
      if (nextMentions) {
        db.run('UPDATE activites SET contenu = ?, mentions = ? WHERE id = ?', [
          nextContenu,
          JSON.stringify(nextMentions),
          id
        ])
        return { ...existing, contenu: nextContenu, mentions: nextMentions }
      }
      db.run('UPDATE activites SET contenu = ? WHERE id = ?', [nextContenu, id])
      return { ...existing, contenu: nextContenu }
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
      const signedPlan =
        existing.type === 'repayment_plan' &&
        parse_contenu_json(existing.contenu)['etat'] === 'signe'
      const isDraft = existing.statut === 'draft' && existing.type !== 'action' && !signedPlan
      const isOwnBoost = existing.type === 'activity_boost' && existing.auteur === destinataire
      const isNoteCreator = existing.type === 'note' && existing.auteur === destinataire
      const action =
        existing.type === 'action' ? parse_action_activity_content(existing.contenu) : null
      const isActionCreator = action != null && action.cree_par === destinataire
      if (!isDraft && !isOwnBoost && !isNoteCreator && !isActionCreator) {
        throw new ActivitiesError('Forbidden', 'forbidden')
      }

      const threadRows = existing.thread_id
        ? db
            .query<{ id: number }, [string]>('SELECT id FROM activites WHERE thread_id = ?')
            .all(existing.thread_id)
        : [{ id: existing.id }]
      const deletedIds = new Set(threadRows.map((row) => Number(row.id)))

      const boosts = db
        .query<ActivityDbRow, [string]>(
          `SELECT * FROM activites WHERE type = 'activity_boost' AND rattachement = ?`
        )
        .all(existing.rattachement)
      for (const boost of boosts) {
        const sourceId = Number(parse_contenu_json(boost.contenu)['activite_source_id'])
        if (deletedIds.has(sourceId)) deletedIds.add(Number(boost.id))
      }

      const ids = [...deletedIds]
      const placeholders = ids.map(() => '?').join(', ')
      db.run(`DELETE FROM activites WHERE id IN (${placeholders})`, ids)
    }
    db.transaction(remove).immediate()
  } finally {
    db.close()
  }
}
