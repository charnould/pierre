import { Database } from 'bun:sqlite'

import { datastorePaths } from './paths'
import { CORE_RECLAMATION_COLUMNS } from './tickets-query'

export class ReclamationsUpsertError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReclamationsUpsertError'
  }
}

export type ReclamationUpsertInput = {
  id_reclamation: string
  id_locataire: string
  message?: string | null
}

export type ReclamationUpsertResult = {
  id_reclamation: string
  id_locataire: string
}

const datastore_path = (): string => datastorePaths().database

const get_column_names = (db: Database): Set<string> =>
  new Set(
    db
      .query<{ name: string }, []>('PRAGMA table_info("reclamations")')
      .all()
      .map((c) => c.name)
  )

const row_exists = (db: Database, id_reclamation: string): boolean => {
  const row = db
    .query<{ n: number }, string[]>(
      'SELECT COUNT(*) as n FROM reclamations WHERE id_reclamation = ?'
    )
    .get(id_reclamation)
  return (row?.n ?? 0) > 0
}

const filter_row_to_columns = (
  input: ReclamationUpsertInput,
  columns: Set<string>
): Record<string, string | null> => {
  const row: Record<string, string | null> = {}

  if (columns.has('id_reclamation')) {
    row['id_reclamation'] = input.id_reclamation.trim()
  }
  if (columns.has('id_locataire')) {
    row['id_locataire'] = input.id_locataire.trim()
  }
  if (columns.has('message') && input.message !== undefined) {
    const trimmed = input.message?.trim() ?? ''
    row['message'] = trimmed.length > 0 ? trimmed : null
  }

  return row
}

/**
 * Inserts or updates a row in the HLM `reclamations` snapshot.
 * The knowledge pipeline must have created the mirror before this is called.
 */
export const upsert_reclamation = (input: ReclamationUpsertInput): ReclamationUpsertResult => {
  const id_reclamation = input.id_reclamation.trim()
  const id_locataire = input.id_locataire.trim()

  if (!id_reclamation) {
    throw new ReclamationsUpsertError('id_reclamation is required')
  }
  if (!id_locataire) {
    throw new ReclamationsUpsertError('id_locataire is required')
  }

  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')

  try {
    const upsert = db.transaction(() => {
      const columns = get_column_names(db)

      for (const core of CORE_RECLAMATION_COLUMNS) {
        if (!columns.has(core)) {
          throw new ReclamationsUpsertError(`missing required column: ${core}`)
        }
      }

      const row = filter_row_to_columns(
        { id_reclamation, id_locataire, message: input.message },
        columns
      )
      const keys = Object.keys(row)

      if (keys.length === 0) {
        throw new ReclamationsUpsertError('no writable columns')
      }

      if (row_exists(db, id_reclamation)) {
        const assignments = keys
          .filter((k) => k !== 'id_reclamation')
          .map((k) => `"${k}" = ?`)
          .join(', ')

        if (assignments.length > 0) {
          const values = keys.filter((k) => k !== 'id_reclamation').map((k) => row[k] ?? null)
          db.run(`UPDATE reclamations SET ${assignments} WHERE id_reclamation = ?`, [
            ...values,
            id_reclamation
          ])
        }
      } else {
        const placeholders = keys.map(() => '?').join(', ')
        db.run(
          `INSERT INTO reclamations (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
          keys.map((k) => row[k] ?? null)
        )
      }

      return { id_reclamation, id_locataire }
    })
    return upsert.immediate()
  } finally {
    db.close()
  }
}
