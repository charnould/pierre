import { Database } from 'bun:sqlite'

import { FIELDS, type Mention } from './carl'
import { migrate_datastore } from './datastore-migrations'
import { datastorePaths } from './paths'

const BATCH = 100

export class CarlReclamationsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CarlReclamationsError'
  }
}

type Row = Record<string, unknown>
type Payload = { columns: string[]; rows: Row[] }
type Classify = (text: string) => Promise<Mention>
type CheckedRow = { id: string; message: string; row: Row }
type FreshQualification = { id: string; mention: Mention }

const messageText = (value: unknown): string => (value == null ? '' : String(value))

const checkedRows = (payload: Payload): { rows: CheckedRow[]; ignored: number } => {
  for (const name of ['id_reclamation', 'message'] as const) {
    if (!payload.columns.includes(name)) {
      throw new CarlReclamationsError(`La colonne ${name} est absente.`)
    }
  }
  const seen = new Set<string>()
  const rows: CheckedRow[] = []
  let ignored = 0
  for (const row of payload.rows) {
    const raw = row['id_reclamation']
    if (raw == null || String(raw).trim() === '') {
      ignored += 1
      continue
    }
    const id = String(raw).trim()
    if (seen.has(id)) {
      throw new CarlReclamationsError(`Identifiant de réclamation en double : ${id}`)
    }
    seen.add(id)
    rows.push({ id, message: messageText(row['message']), row })
  }
  return { rows, ignored }
}

const readCache = (db: Database): Map<string, Mention> => {
  const mentions = new Map<string, Mention>()
  const rows = db
    .query<{ id_reclamation: string } & Mention, []>(
      `SELECT id_reclamation, domaine, sous_domaine, motif, integrite_physique, lieu,
              obligation_reglementaire, ton
       FROM carl_qualifications`
    )
    .all()
  for (const row of rows) {
    const { id_reclamation, ...mention } = row
    mentions.set(id_reclamation, mention)
  }
  return mentions
}

export const qualifyReclamations = async (
  payload: Payload,
  classifyText?: Classify
): Promise<Payload> => {
  const { rows, ignored } = checkedRows(payload)
  if (ignored > 0) {
    console.info(`CARL réclamations : ${ignored} ignorées sans identifiant`)
  }
  await migrate_datastore(datastorePaths().database)
  const db = new Database(datastorePaths().database)
  try {
    const mentions = readCache(db)
    const missing = rows.filter((row) => !mentions.has(row.id))
    if (missing.length === 0) {
      console.info(`CARL réclamations : ${rows.length}/${rows.length} déjà qualifiées`)
    } else {
      console.info(`CARL réclamations : ${rows.length} au total, ${missing.length} à qualifier`)
      const classify = classifyText ?? (await import('./carl-session')).classify
      const insert = db.prepare(
        `INSERT INTO carl_qualifications (
           id_reclamation, domaine, sous_domaine, motif, integrite_physique, lieu,
           obligation_reglementaire, ton
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      const commit = db.transaction((batch: readonly FreshQualification[]) => {
        for (const item of batch) {
          insert.run(
            item.id,
            item.mention.domaine,
            item.mention.sous_domaine,
            item.mention.motif,
            item.mention.integrite_physique,
            item.mention.lieu,
            item.mention.obligation_reglementaire,
            item.mention.ton
          )
        }
      })
      const pending: FreshQualification[] = []
      let qualified = 0
      const started = performance.now()
      const flush = () => {
        if (pending.length === 0) return
        commit(pending)
        for (const item of pending) mentions.set(item.id, item.mention)
        qualified += pending.length
        pending.length = 0
        console.info(`CARL réclamations : ${qualified}/${missing.length} qualifiées`)
      }
      for (const row of missing) {
        pending.push({ id: row.id, mention: await classify(row.message) })
        if (pending.length === BATCH) flush()
      }
      flush()
      const seconds = Math.round((performance.now() - started) / 1000)
      console.info(
        `CARL réclamations : ${missing.length}/${missing.length} qualifiées en ${seconds}s`
      )
    }

    const reserved = new Set<string>(FIELDS)
    return {
      columns: [...payload.columns.filter((column) => !reserved.has(column)), ...FIELDS],
      rows: rows.map(({ id, row }) => ({
        ...Object.fromEntries(Object.entries(row).filter(([column]) => !reserved.has(column))),
        ...mentions.get(id)!
      }))
    }
  } finally {
    db.close()
  }
}
