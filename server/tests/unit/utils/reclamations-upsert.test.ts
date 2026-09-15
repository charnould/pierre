import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { ReclamationsUpsertError, upsert_reclamation } from '../../../utils/reclamations-upsert'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('reclamations_upsert')
const DATASTORE_SQLITE = paths.database

const create_reclamations_table = () => {
  const db = new Database(DATASTORE_SQLITE)
  db.run(
    `CREATE TABLE reclamations (
       id_reclamation TEXT UNIQUE, id_locataire TEXT, id_lot TEXT, message TEXT
     )`
  )
  db.close()
}

beforeAll(async () => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(paths.root, { recursive: true })
  await setup()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('upsert_reclamation', () => {
  it('inserts a minimal row into the imported schema', () => {
    create_reclamations_table()
    const result = upsert_reclamation({
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })

    expect(result).toEqual({
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })

    const db = new Database(DATASTORE_SQLITE)
    const row = db
      .query<
        {
          id_reclamation: string
          id_locataire: string
          id_lot: string | null
          message: string | null
        },
        []
      >('SELECT id_reclamation, id_locataire, id_lot, message FROM reclamations')
      .get()
    db.close()

    expect(row).toEqual({
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz',
      id_lot: null,
      message: null
    })
  })

  it('updates message on existing row', () => {
    create_reclamations_table()
    upsert_reclamation({
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })

    upsert_reclamation({
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz',
      message: 'Bonjour, j ai une fuite.'
    })

    const db = new Database(DATASTORE_SQLITE)
    const rows = db.query<{ message: string | null }, []>('SELECT * FROM reclamations').all()
    db.close()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.message).toBe('Bonjour, j ai une fuite.')
  })

  it('respects existing ERP schema and ignores unknown columns', async () => {
    const db = new Database(DATASTORE_SQLITE)
    await import_json_rows(db, 'reclamations', [
      {
        id_reclamation: 'REQ-1',
        id_locataire: 'LOC-A',
        id_lot: 'LOT-1',
        motif: 'fuite'
      }
    ])
    db.close()

    upsert_reclamation({
      id_reclamation: 'reclamation-new',
      id_locataire: 'locataire-new',
      message: 'Message manuel'
    })

    const readDb = new Database(DATASTORE_SQLITE)
    const row = readDb
      .query<{ id_reclamation: string; id_locataire: string; motif: string | null }, [string]>(
        'SELECT id_reclamation, id_locataire, motif FROM reclamations WHERE id_reclamation = ?'
      )
      .get('reclamation-new')
    readDb.close()

    expect(row?.id_reclamation).toBe('reclamation-new')
    expect(row?.id_locataire).toBe('locataire-new')
    expect(row?.motif).toBeNull()
  })

  it('throws when id_reclamation is empty', () => {
    expect(() =>
      upsert_reclamation({
        id_reclamation: '  ',
        id_locataire: 'locataire-xyz'
      })
    ).toThrow(ReclamationsUpsertError)
  })

  it('throws when id_locataire is empty', () => {
    expect(() =>
      upsert_reclamation({
        id_reclamation: 'reclamation-abc',
        id_locataire: ''
      })
    ).toThrow(ReclamationsUpsertError)
  })
})
