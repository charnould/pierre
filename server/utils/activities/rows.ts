import { Database } from 'bun:sqlite'

import desktop_config from '../../../customization/desktop'
import {
  ACTIVITY_CONTEXTS,
  type Activite,
  type ActivityContext,
  type ActivityType,
  type CommunicationChannel,
  type Mention,
  is_activity_type,
  parse_activity_content
} from '../../../shared/activites'
import {
  DESKTOP_AGENT_DESTINATAIRE,
  desktopAgentMentionHandle
} from '../../../shared/agent-identity'
import { datastorePaths } from '../paths'
import { send_telemetry } from '../send-telemetry'
import { ActivitiesError, ActivityRowSchema, AUTHOR_RE, MENTION_RE, parse_mentions } from './schema'

export type ActivityDbRow = Omit<Activite, 'mentions' | 'type' | 'channel'> & {
  mentions: string
  type: string
  channel: string | null
  bulk_id?: string | null
  execution_id?: string | null
  idempotency_key?: string | null
}

export type ActivityFacets = Pick<Activite, 'id_client' | 'id_locataire' | 'id_lot'>

export const datastore_path = (): string => datastorePaths().database
export const login_from_email = (email: string): string => {
  const at = email.indexOf('@')
  return (at === -1 ? email : email.slice(0, at)).trim().toLowerCase()
}

export const user_destinataire = (email: string): string => `user:${email.trim().toLowerCase()}`

export const build_rattachement = (contexte: ActivityContext, ref: string): string =>
  `${contexte}:${ref.trim()}`

export const parse_rattachement = (
  rattachement: string
): { contexte: ActivityContext; ref: string } | null => {
  const separator = rattachement.indexOf(':')
  if (separator <= 0) return null
  const contexte = rattachement.slice(0, separator)
  const ref = rattachement.slice(separator + 1)
  if (!(ACTIVITY_CONTEXTS as readonly string[]).includes(contexte) || !ref) return null
  return { contexte: contexte as ActivityContext, ref }
}

export const normalize_activity_content = (type: ActivityType, raw: string): string => {
  const parsed = parse_activity_content(type, raw)
  if (!parsed) throw new ActivitiesError(`Invalid ${type} content`)
  return JSON.stringify(parsed)
}

export const row_to_activity = (row: ActivityDbRow): Activite => {
  if (!is_activity_type(row.type)) throw new Error(`Unknown activity type ${row.type}`)
  return {
    ...row,
    id: Number(row.id),
    destinataire: row.destinataire ?? null,
    type: row.type,
    channel: (row.channel as CommunicationChannel | null) ?? null,
    mentions: parse_mentions(row.mentions),
    contenu: row.contenu,
    thread_id: row.thread_id ?? null,
    revision: row.revision == null ? null : Number(row.revision),
    bulk_id: row.bulk_id ?? null,
    execution_id: row.execution_id ?? null,
    idempotency_key: row.idempotency_key ?? null
  }
}

export type InsertActivityValues = {
  date_creation: string
  rattachement: string
  auteur: string
  destinataire?: string | null
  facets: ActivityFacets
  type: ActivityType
  channel?: CommunicationChannel | null
  mentions: Mention[]
  contenu: string
  thread_id?: string | null
  revision?: number | null
  bulk_id?: string | null
  execution_id?: string | null
  idempotency_key?: string | null
}

export const insert_activity_row = (db: Database, values: InsertActivityValues): Activite => {
  const row_shape = ActivityRowSchema.parse({
    type: values.type,
    channel: values.channel ?? null,
    thread_id: values.thread_id ?? null,
    revision: values.revision ?? null
  })
  const contenu = normalize_activity_content(values.type, values.contenu)
  const row = db
    .query<ActivityDbRow, Array<string | number | null>>(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, destinataire,
         id_client, id_locataire, id_lot, type, channel, mentions, contenu,
         thread_id, revision, bulk_id, execution_id, idempotency_key
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .get(
      values.date_creation,
      values.rattachement,
      values.auteur,
      values.destinataire ?? null,
      values.facets.id_client,
      values.facets.id_locataire,
      values.facets.id_lot,
      row_shape.type,
      row_shape.channel,
      JSON.stringify(values.mentions),
      contenu,
      row_shape.thread_id,
      row_shape.revision,
      values.bulk_id ?? null,
      values.execution_id ?? null,
      values.idempotency_key ?? null
    )
  if (!row) throw new Error('Failed to append activity')
  send_telemetry(values.type, db)
  return row_to_activity(row)
}

const table_columns = (db: Database, table: string): Set<string> =>
  new Set(
    (
      db.query<{ name: string }, []>(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all() ??
      []
    ).map((row) => row.name)
  )

const resolve_client_from_lot = (db: Database, id_lot: string | null): string | null => {
  if (!id_lot) return null
  const columns = table_columns(db, 'lots_locatifs')
  if (!columns.has('id_lot') || !columns.has('id_client')) return null
  const row = db
    .query<{ id_client: string | null }, [string]>(
      'SELECT id_client FROM lots_locatifs WHERE id_lot = ? LIMIT 1'
    )
    .get(id_lot)
  return row?.id_client ? String(row.id_client) : null
}

export const resolve_activity_facets = (
  db: Database,
  contexte: ActivityContext,
  ref: string
): ActivityFacets => {
  if (contexte === 'automations' || contexte === 'bulk' || contexte === 'a_qualifier') {
    return { id_client: null, id_locataire: null, id_lot: null }
  }

  if (contexte === 'tickets') {
    const columns = table_columns(db, 'reclamations')
    if (!columns.has('id_reclamation')) {
      return { id_client: null, id_locataire: null, id_lot: null }
    }
    const selected = ['id_locataire', 'id_lot', 'id_client'].filter((column) => columns.has(column))
    if (selected.length === 0) return { id_client: null, id_locataire: null, id_lot: null }
    const row = db
      .query<Record<string, string | null>, [string]>(
        `SELECT ${selected.map((column) => `"${column}"`).join(', ')}
         FROM reclamations WHERE id_reclamation = ? LIMIT 1`
      )
      .get(ref)
    const id_locataire = row?.['id_locataire'] ? String(row['id_locataire']) : null
    const id_lot = row?.['id_lot'] ? String(row['id_lot']) : null
    const directClient = row?.['id_client'] ? String(row['id_client']) : null
    return {
      id_client: directClient ?? resolve_client_from_lot(db, id_lot),
      id_locataire,
      id_lot
    }
  }

  const columns = table_columns(db, 'lots_locatifs')
  if (!columns.has('id_locataire')) {
    return { id_client: null, id_locataire: ref, id_lot: null }
  }
  const selected = ['id_lot', 'id_client'].filter((column) => columns.has(column))
  const rows =
    selected.length === 0
      ? []
      : db
          .query<Record<string, string | null>, [string]>(
            `SELECT ${selected.map((column) => `"${column}"`).join(', ')}
             FROM lots_locatifs WHERE id_locataire = ?`
          )
          .all(ref)
  const lots = new Set(
    rows
      .map((row) => row['id_lot'])
      .filter(Boolean)
      .map(String)
  )
  const clients = new Set(
    rows
      .map((row) => row['id_client'])
      .filter(Boolean)
      .map(String)
  )
  return {
    id_client: clients.size === 1 ? [...clients][0]! : null,
    id_locataire: ref,
    id_lot: lots.size === 1 ? [...lots][0]! : null
  }
}

export const org_email_index = (
  db: Database
): { byEmail: Map<string, string>; byLogin: Map<string, string> } => {
  const byEmail = new Map<string, string>()
  const byLogin = new Map<string, string>()
  if (!table_columns(db, 'users').has('email')) return { byEmail, byLogin }
  const rows = db.query<{ email: string }, []>('SELECT email FROM users').all()
  for (const row of rows) {
    const email = row.email.trim().toLowerCase()
    if (!email) continue
    byEmail.set(email, email)
    byLogin.set(login_from_email(email), email)
  }
  return { byEmail, byLogin }
}

export const resolve_destinataire = (
  token: string,
  index: { byEmail: Map<string, string>; byLogin: Map<string, string> }
): string | null => {
  const raw = token.trim()
  if (!raw) return null
  const lowered = raw.toLowerCase()
  if (lowered === desktopAgentMentionHandle(desktop_config.name)) {
    return DESKTOP_AGENT_DESTINATAIRE
  }
  if (AUTHOR_RE.test(raw)) return raw.startsWith('user:') ? raw.toLowerCase() : raw
  if (lowered.includes('@')) {
    return user_destinataire(index.byEmail.get(lowered) ?? lowered)
  }
  const email = index.byLogin.get(lowered)
  return email ? user_destinataire(email) : null
}

const tokens_from_content = (contenu: string): string[] =>
  [...contenu.matchAll(MENTION_RE)]
    .map((match) => match[1])
    .filter((token): token is string => Boolean(token))

export const build_mentions = (
  db: Database,
  contenu: string,
  explicit: string[] = []
): Mention[] => {
  const index = org_email_index(db)
  const seen = new Set<string>()
  const mentions: Mention[] = []
  for (const token of [...tokens_from_content(contenu), ...explicit]) {
    const destinataire = resolve_destinataire(token, index)
    if (!destinataire || seen.has(destinataire)) continue
    seen.add(destinataire)
    mentions.push({ destinataire })
  }
  return mentions
}

export const merge_mentions_from_content = (
  db: Database,
  contenu: string,
  existing: Mention[]
): Mention[] => {
  const previous = new Map(existing.map((mention) => [mention.destinataire, mention]))
  return build_mentions(db, contenu).map((fresh) => previous.get(fresh.destinataire) ?? fresh)
}

export const get_activity_with_db = (db: Database, id: number): Activite | null => {
  const row = db
    .query<ActivityDbRow, [number]>('SELECT * FROM activites WHERE id = ? LIMIT 1')
    .get(id)
  return row ? row_to_activity(row) : null
}

export const get_activity = (id: number): Activite | null => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    return get_activity_with_db(db, id)
  } finally {
    db.close()
  }
}

export const get_activity_by_idempotency_key = (key: string): Activite | null => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = db
      .query<ActivityDbRow, [string]>('SELECT * FROM activites WHERE idempotency_key = ? LIMIT 1')
      .get(key)
    return row ? row_to_activity(row) : null
  } finally {
    db.close()
  }
}
