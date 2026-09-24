import { Database } from 'bun:sqlite'

import {
  type Activite,
  type ActivityContext,
  type CommunicationChannel,
  activity_timestamp,
  medium_to_channel,
  parse_communication_opened_content,
  parse_contenu_json
} from '../../../shared/activites'
import { latest_repayment_states } from '../activities/repayment'
import {
  build_rattachement,
  get_activity_with_db,
  insert_activity_row,
  login_from_email,
  resolve_activity_facets,
  type ActivityDbRow,
  user_destinataire
} from '../activities/rows'
import { normalize_email, normalize_telephone } from '../contacts'
import { datastorePaths } from '../paths'
import { name } from '../setup-store'

export const datastore_path = (): string => datastorePaths().database

export class CommunicationsError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'not_found'
      | 'forbidden'
      | 'invalid_body'
      | 'conflict'
      | 'invalid_status' = 'invalid_body'
  ) {
    super(message)
    this.name = 'CommunicationsError'
  }
}

const require_activity_with_db = (db: Database, id: number): Activite => {
  const activity = get_activity_with_db(db, id)
  if (!activity) throw new CommunicationsError('Communication introuvable', 'not_found')
  return activity
}

const require_channel = (medium: string): CommunicationChannel => {
  const channel = medium_to_channel(medium)
  if (!channel) throw new CommunicationsError('Canal invalide')
  return channel
}

const opened_contenu = (raw: string, sender: string): string => {
  const value = parse_contenu_json(raw)
  const injectedSender =
    typeof value['sender'] === 'string' && value['sender'].trim() ? value['sender'].trim() : sender
  const content = parse_communication_opened_content(
    JSON.stringify({
      ...value,
      version: 2,
      sender: injectedSender,
      body: typeof value['body'] === 'string' ? value['body'] : ''
    })
  )
  if (!content) throw new CommunicationsError('Contenu de communication invalide')
  return JSON.stringify(content)
}

const thread_revision = (db: Database, thread_id: string): number =>
  (db
    .query<{ revision: number | null }, [string]>(
      'SELECT MAX(revision) AS revision FROM activites WHERE thread_id = ?'
    )
    .get(thread_id)?.revision ?? 0) + 1

const table_has_column = (db: Database, table: string, column: string): boolean =>
  db
    .query<{ name: string }, []>(`PRAGMA table_info("${table.replaceAll('"', '""')}")`)
    .all()
    .some((item) => item.name === column)

type CreateOutboundInputBase = {
  actor: string
  contexte: ActivityContext
  ref: string
  type: string
  contenu: string
  idempotency_key: string
  bulk_id?: string | null
  execution_id?: string | null
  recipients?: string[]
  notify_current_manager?: boolean
  require_bulk_run?: { bulk_operation_id: string; execution_id: string }
  imported?: boolean
}

export type CreateOutboundInput = CreateOutboundInputBase &
  (
    | { destinataire: string; allow_missing_destination?: false }
    | { destinataire?: string; allow_missing_destination: true }
  )

export const create_outbound_with_db = (db: Database, input: CreateOutboundInput): Activite => {
  const rawDestination = input.destinataire ?? ''
  const destination = input.imported
    ? { value: rawDestination.trim(), status: 'ok' as const }
    : input.type === 'rcs' || input.type === 'sms'
      ? normalize_telephone(rawDestination)
      : input.type === 'email' || input.type === 'lre'
        ? normalize_email(rawDestination)
        : { value: rawDestination.trim(), status: 'ok' as const }
  if (
    (!destination.value && !input.allow_missing_destination) ||
    (destination.value && destination.status === 'invalid')
  ) {
    throw new CommunicationsError('Destinataire invalide')
  }
  const destinationValue = destination.value || null
  if (input.require_bulk_run) {
    const activeRun = db
      .query<{ n: number }, [string, string]>(
        `SELECT COUNT(*) AS n
           FROM activites run
           JOIN bulk_operations operation ON operation.id = run.bulk_id
           WHERE run.type = 'bulk.ran'
             AND run.bulk_id = ? AND run.execution_id = ?`
      )
      .get(input.require_bulk_run.bulk_operation_id, input.require_bulk_run.execution_id)?.n
    if (!activeRun) {
      throw new CommunicationsError('Exécution bulk supprimée', 'not_found')
    }
  }
  const rattachement = build_rattachement(input.contexte, input.ref)
  const facets = resolve_activity_facets(db, input.contexte, input.ref)
  const manager =
    input.notify_current_manager && facets.id_locataire
      ? (latest_repayment_states(db, [facets.id_locataire]).get(facets.id_locataire)
          ?.gestionnaire_email ?? null)
      : null
  let requestedContent = input.contenu
  if (manager) {
    try {
      requestedContent = JSON.stringify({
        ...(JSON.parse(input.contenu) as Record<string, unknown>),
        referent_notification: `Référent notifié : @${login_from_email(manager)}`
      })
    } catch {
      requestedContent = input.contenu
    }
  }
  const channel = require_channel(input.type)
  const openedType = input.imported ? 'communication.imported' : 'communication.sent'
  const author = user_destinataire(input.actor)
  const contenu = opened_contenu(requestedContent, author)
  const existing = db
    .query<
      {
        id: number
        rattachement: string
        auteur: string
        type: string
        channel: string | null
        destinataire: string | null
        contenu: string
      },
      [string]
    >(
      `SELECT id, rattachement, auteur, type, channel, destinataire, contenu
         FROM activites WHERE idempotency_key = ? LIMIT 1`
    )
    .get(input.idempotency_key)
  if (existing) {
    if (
      existing.rattachement !== rattachement ||
      existing.auteur !== author ||
      existing.type !== openedType ||
      existing.channel !== channel ||
      existing.destinataire !== destinationValue ||
      existing.contenu !== contenu
    ) {
      throw new CommunicationsError(
        'Idempotency-Key déjà utilisée pour une autre communication',
        'conflict'
      )
    }
    return require_activity_with_db(db, Number(existing.id))
  }

  const now = activity_timestamp()
  if (
    input.type === 'rcs' &&
    input.contexte === 'repayment' &&
    facets.id_locataire &&
    table_has_column(db, 'lots_locatifs', 'telephone_locataire')
  ) {
    const participant = db
      .query<{ telephone_locataire: string | null }, [string]>(
        `SELECT telephone_locataire FROM lots_locatifs
           WHERE id_locataire = ? LIMIT 1`
      )
      .get(facets.id_locataire)
    const expected = participant?.telephone_locataire
      ? normalize_telephone(participant.telephone_locataire)
      : null
    if (expected && expected.status !== 'invalid' && expected.value !== destinationValue) {
      throw new CommunicationsError(
        'Le numéro ne correspond pas au participant du dossier',
        'forbidden'
      )
    }
  }
  const threadId = Bun.randomUUIDv7()
  return insert_activity_row(db, {
    date_creation: now,
    rattachement,
    auteur: author,
    destinataire: destinationValue,
    facets,
    type: openedType,
    channel,
    mentions: [...(input.recipients ?? []), ...(manager ? [manager] : [])].map((recipient) => ({
      destinataire: recipient.startsWith('user:')
        ? recipient.toLowerCase()
        : user_destinataire(recipient)
    })),
    contenu,
    thread_id: threadId,
    revision: 1,
    bulk_id: input.bulk_id ?? null,
    execution_id: input.execution_id ?? null,
    idempotency_key: input.idempotency_key
  })
}

export const create_outbound = (input: CreateOutboundInput): Activite => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    db.run('BEGIN IMMEDIATE')
    const activity = create_outbound_with_db(db, input)
    db.run('COMMIT')
    return activity
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

export type DispatchClaim = 'claimed' | 'pending' | 'abandoned' | 'not_queued'

/** Read-only: a send is claimable when its thread has no result yet. */
export const claim_outbound_dispatch = (activity_id: number): DispatchClaim => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const activity = get_activity_with_db(db, activity_id)
    if (!activity || activity.type !== 'communication.sent' || !activity.thread_id) {
      return 'not_queued'
    }
    const latest = db
      .query<ActivityDbRow, [string]>(
        `SELECT * FROM activites
         WHERE thread_id = ? AND type LIKE 'communication.%'
         ORDER BY revision DESC LIMIT 1`
      )
      .get(activity.thread_id)
    if (!latest) return 'not_queued'
    if (latest.type === 'communication.ok' || latest.type === 'communication.failed') {
      return 'not_queued'
    }
    return 'claimed'
  } finally {
    db.close()
  }
}

export type CreateInboundInput = {
  contexte: ActivityContext
  ref: string
  type: 'rcs' | 'email'
  auteur: string
  contenu: string
  occurred_at: string
  thread_id?: string
  idempotency_key?: string
}

export const create_inbound = (input: CreateInboundInput): Activite => {
  const occurred = new Date(input.occurred_at)
  if (Number.isNaN(occurred.getTime())) {
    throw new CommunicationsError('occurredAt invalide')
  }
  const occurredAt = occurred.toISOString()
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  db.run('BEGIN IMMEDIATE')
  try {
    if (input.idempotency_key) {
      const existing = db
        .query<{ id: number }, [string]>(
          'SELECT id FROM activites WHERE idempotency_key = ? LIMIT 1'
        )
        .get(input.idempotency_key)
      if (existing) {
        const activity = require_activity_with_db(db, Number(existing.id))
        db.run('COMMIT')
        return activity
      }
    }

    const rattachement = build_rattachement(input.contexte, input.ref)
    const facets = resolve_activity_facets(db, input.contexte, input.ref)
    const threadId = input.thread_id ?? Bun.randomUUIDv7()
    const mentions: { destinataire: string }[] = []
    if (input.contexte === 'repayment' && facets.id_locataire) {
      const manager = db
        .query<{ contenu: string }, [string, string]>(
          `SELECT contenu FROM activites
           WHERE id_locataire = ?
             AND rattachement = 'repayment:' || ?
             AND type = 'case.assignee_changed'
           ORDER BY date_creation DESC, id DESC LIMIT 1`
        )
        .get(facets.id_locataire, facets.id_locataire)
      if (manager) {
        try {
          const value = JSON.parse(manager.contenu) as { after?: { id?: unknown } | string }
          const after = value.after
          const email =
            typeof after === 'string'
              ? after
              : after && typeof after === 'object' && typeof after.id === 'string'
                ? after.id
                : ''
          if (email.trim()) {
            mentions.push({
              destinataire: email.includes(':') ? email : user_destinataire(email)
            })
          }
        } catch {
          // A malformed assignment must not lose an inbound message.
        }
      }
    }
    const activity = insert_activity_row(db, {
      date_creation: occurredAt,
      rattachement,
      auteur: input.auteur,
      destinataire: name(),
      facets,
      type: 'communication.received',
      channel: require_channel(input.type),
      mentions,
      contenu: opened_contenu(input.contenu, input.auteur),
      thread_id: threadId,
      revision: thread_revision(db, threadId),
      idempotency_key: input.idempotency_key ?? null
    })
    db.run('COMMIT')
    return activity
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

export const create_unmatched_inbound = (
  input: Omit<CreateInboundInput, 'contexte' | 'ref' | 'thread_id'>
): Activite => {
  const id = Bun.randomUUIDv7()
  return create_inbound({
    ...input,
    contexte: 'a_qualifier',
    ref: id,
    thread_id: id
  })
}
