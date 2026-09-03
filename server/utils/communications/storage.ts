import { Database, type SQLQueryBindings } from 'bun:sqlite'

import desktop_config from '../../../customization/desktop'
import {
  type Activite,
  type ActivityContext,
  type CommunicationType,
  activity_timestamp
} from '../../../shared/activites'
import { latest_repayment_states } from '../activities/repayment'
import {
  build_rattachement,
  get_activity_with_db,
  login_from_email,
  resolve_activity_facets,
  user_destinataire
} from '../activities/rows'
import { normalize_email, normalize_telephone } from '../contacts'
import { datastorePaths } from '../paths'

export const datastore_path = (): string => datastorePaths().database

const without_delivery_metadata = (raw: string): string => {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    delete value['referent_notification']
    if (value['delivery'] && typeof value['delivery'] === 'object') {
      const delivery = { ...(value['delivery'] as Record<string, unknown>) }
      delete delivery['history']
      delete delivery['fallback']
      delete delivery['finalFailure']
      delete delivery['dispatch_started_at']
      delete delivery['dispatch_abandoned_at']
      if (Object.keys(delivery).length > 0) value['delivery'] = delivery
      else delete value['delivery']
    }
    return JSON.stringify(value)
  } catch {
    return raw
  }
}

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

const permanent_thread = (db: Database, rattachement: string, type: CommunicationType): string => {
  const existing = db
    .query<{ thread_id: string }, [string, string]>(
      `SELECT thread_id
       FROM activites
       WHERE rattachement = ? AND type = ? AND thread_id IS NOT NULL
       ORDER BY date_creation ASC, id ASC
       LIMIT 1`
    )
    .get(rattachement, type)
  return existing?.thread_id ?? Bun.randomUUIDv7()
}

const table_has_column = (db: Database, table: string, column: string): boolean =>
  db
    .query<{ name: string }, []>(`PRAGMA table_info("${table.replaceAll('"', '""')}")`)
    .all()
    .some((item) => item.name === column)

export type CreateOutboundInput = {
  actor: string
  contexte: ActivityContext
  ref: string
  type: CommunicationType
  destinataire: string
  contenu: string
  idempotency_key: string
  bulk_id?: string | null
  execution_id?: string | null
  recipients?: string[]
  notify_current_manager?: boolean
  require_bulk_run?: { bulk_operation_id: string; execution_id: string }
}

export const create_outbound_with_db = (db: Database, input: CreateOutboundInput): Activite => {
  const destination =
    input.type === 'rcs' || input.type === 'sms'
      ? normalize_telephone(input.destinataire)
      : input.type === 'email' || input.type === 'lre'
        ? normalize_email(input.destinataire)
        : { value: input.destinataire.trim(), status: 'ok' as const }
  if (!destination.value || destination.status === 'invalid') {
    throw new CommunicationsError('Destinataire invalide')
  }
  if (input.require_bulk_run) {
    const activeRun = db
      .query<{ n: number }, [string, string]>(
        `SELECT COUNT(*) AS n
           FROM activites run
           JOIN bulk_operations operation ON operation.id = run.bulk_id
           WHERE run.type = 'bulk_run'
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
  const existing = db
    .query<
      {
        id: number
        rattachement: string
        type: string
        destinataire: string | null
        contenu: string
      },
      [string]
    >(
      `SELECT id, rattachement, type, destinataire, contenu
         FROM activites WHERE idempotency_key = ? LIMIT 1`
    )
    .get(input.idempotency_key)
  if (existing) {
    if (
      existing.rattachement !== rattachement ||
      existing.type !== input.type ||
      existing.destinataire !== destination.value ||
      without_delivery_metadata(existing.contenu) !== without_delivery_metadata(requestedContent)
    ) {
      throw new CommunicationsError(
        'Idempotency-Key déjà utilisée pour une autre communication',
        'conflict'
      )
    }
    return require_activity_with_db(db, Number(existing.id))
  }

  const now = new Date().toISOString()
  let contenu = requestedContent
  try {
    const payload = JSON.parse(requestedContent) as Record<string, unknown>
    contenu = JSON.stringify({
      ...payload,
      delivery: {
        ...(payload['delivery'] && typeof payload['delivery'] === 'object'
          ? (payload['delivery'] as Record<string, unknown>)
          : {}),
        history: [{ status: 'queued', occurred_at: now }]
      }
    })
  } catch {
    // Dedicated callers already validate communication content.
  }
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
    if (expected && expected.status !== 'invalid' && expected.value !== destination.value) {
      throw new CommunicationsError(
        'Le numéro ne correspond pas au participant du dossier',
        'forbidden'
      )
    }
  }
  const threadId = permanent_thread(db, rattachement, input.type)
  const row = db
    .query<{ id: number }, SQLQueryBindings[]>(
      `INSERT INTO activites (
           date_creation, date_statut, rattachement, auteur, destinataire,
           id_client, id_locataire, id_lot, type, statut, mentions, contenu,
           thread_id, bulk_id, execution_id, idempotency_key
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)
         RETURNING id`
    )
    .get(
      now,
      now,
      rattachement,
      user_destinataire(input.actor),
      destination.value,
      facets.id_client,
      facets.id_locataire,
      facets.id_lot,
      input.type,
      JSON.stringify(
        [...(input.recipients ?? []), ...(manager ? [manager] : [])].map((recipient) => ({
          destinataire: recipient.startsWith('user:')
            ? recipient.toLowerCase()
            : user_destinataire(recipient),
          lu: false,
          boost: null
        }))
      ),
      contenu,
      threadId,
      input.bulk_id ?? null,
      input.execution_id ?? null,
      input.idempotency_key
    )
  if (!row) throw new CommunicationsError('Création de la communication impossible')
  return require_activity_with_db(db, Number(row.id))
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

/** Atomically claims a queued send and terminally fails stale, ambiguous dispatches. */
export const claim_outbound_dispatch = (activity_id: number): DispatchClaim => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const claim = db.transaction(() => {
      const activity = get_activity_with_db(db, activity_id)
      if (!activity || activity.statut !== 'queued') return 'not_queued'
      const content = JSON.parse(activity.contenu) as Record<string, unknown>
      const delivery =
        content['delivery'] && typeof content['delivery'] === 'object'
          ? { ...(content['delivery'] as Record<string, unknown>) }
          : {}
      const now = new Date()
      const startedAt =
        typeof delivery['dispatch_started_at'] === 'string'
          ? new Date(delivery['dispatch_started_at']).getTime()
          : Number.NaN
      if (Number.isFinite(startedAt)) {
        if (now.getTime() - startedAt < 60_000) return 'pending'
        const occurredAt = activity_timestamp(now)
        const history = Array.isArray(delivery['history']) ? delivery['history'] : []
        delivery['history'] = [
          ...history,
          { status: 'failed', occurred_at: occurredAt, reason: 'dispatch_state_unknown' }
        ]
        delivery['dispatch_abandoned_at'] = occurredAt
        db.run('UPDATE activites SET statut = ?, date_statut = ?, contenu = ? WHERE id = ?', [
          'failed',
          occurredAt,
          JSON.stringify({ ...content, delivery }),
          activity_id
        ])
        return 'abandoned'
      }
      delivery['dispatch_started_at'] = activity_timestamp(now)
      db.run('UPDATE activites SET contenu = ? WHERE id = ?', [
        JSON.stringify({ ...content, delivery }),
        activity_id
      ])
      return 'claimed'
    })
    return claim.immediate()
  } finally {
    db.close()
  }
}

export type CreateInboundInput = {
  contexte: ActivityContext
  ref: string
  type: Extract<CommunicationType, 'rcs' | 'email'>
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
    const threadId = input.thread_id ?? permanent_thread(db, rattachement, input.type)
    const recipients: { destinataire: string; lu: boolean; boost: null }[] = []
    if (input.contexte === 'repayment' && facets.id_locataire) {
      const manager = db
        .query<{ contenu: string }, [string]>(
          `SELECT contenu FROM activites
           WHERE id_locataire = ? AND type = 'repayment_assignment'
           ORDER BY date_creation DESC, id DESC LIMIT 1`
        )
        .get(facets.id_locataire)
      if (manager) {
        try {
          const value = JSON.parse(manager.contenu) as { gestionnaire?: unknown }
          if (typeof value.gestionnaire === 'string' && value.gestionnaire.trim()) {
            recipients.push({
              destinataire: user_destinataire(value.gestionnaire),
              lu: false,
              boost: null
            })
          }
        } catch {
          // A malformed historical assignment must not lose an inbound message.
        }
      }
    }
    const row = db
      .query<{ id: number }, SQLQueryBindings[]>(
        `INSERT INTO activites (
           date_creation, date_statut, rattachement, auteur, destinataire,
           id_client, id_locataire, id_lot, type, statut, mentions, contenu,
           thread_id, idempotency_key
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?, ?)
         RETURNING id`
      )
      .get(
        occurredAt,
        occurredAt,
        rattachement,
        input.auteur,
        desktop_config.name,
        facets.id_client,
        facets.id_locataire,
        facets.id_lot,
        input.type,
        JSON.stringify(recipients),
        input.contenu,
        threadId,
        input.idempotency_key ?? null
      )
    if (!row) throw new CommunicationsError('Réception de la communication impossible')
    const activity = require_activity_with_db(db, Number(row.id))
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
