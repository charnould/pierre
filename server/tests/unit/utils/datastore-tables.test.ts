import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  DATASTORE_TABLES,
  type DatastoreTableStatus,
  get_datastore_tables
} from '../../../utils/datastore-tables'
import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'
import { setup } from '../../../utils/setup'

const TEST_SERVICE = '_test_datastore_tables_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`
const DATASTORE_SQLITE = `${DATASTORE_ROOT}/datastore.sqlite`

const all_missing = (): DatastoreTableStatus[] =>
  [...DATASTORE_TABLES].sort((a, b) => a.localeCompare(b)).map((name) => ({ name, exists: false }))

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) {
    delete Bun.env['SERVICE']
  } else {
    Bun.env['SERVICE'] = ORIGINAL_SERVICE
  }
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('get_datastore_tables', () => {
  it('returns all tables as absent when none are imported', () => {
    expect(get_datastore_tables().tables).toEqual(all_missing())
  })

  it('returns all tables as absent when datastore.sqlite is missing', async () => {
    await rm(DATASTORE_SQLITE, { force: true })
    expect(get_datastore_tables().tables).toEqual(all_missing())
  })

  it('propagates datastore corruption instead of reporting every table absent', async () => {
    await rm(DATASTORE_SQLITE, { force: true })
    await Bun.write(DATASTORE_SQLITE, 'not a sqlite database')
    expect(() => get_datastore_tables()).toThrow()
  })

  it('marks only imported tables as present and sorts present rows first', () => {
    const db = new Database(DATASTORE_SQLITE)
    try {
      import_json_rows(db, 'reclamations', [
        { id_reclamation: 'REQ-1', id_locataire: 'LOC-A', id_lot: 'LOT-1' }
      ])
      import_json_rows(db, 'comptes_locataires', [
        {
          id_locataire: 'LOC-A',
          id_client: 'CLI-A',
          montant_en_euros: 450
        }
      ])
    } finally {
      db.close()
    }

    const result = get_datastore_tables()

    expect(result.tables.map((t) => t.name)).toEqual([
      'comptes_locataires',
      'reclamations',
      'candidatures',
      'lots_locatifs',
      'travaux'
    ])
    expect(result.tables.filter((t) => t.exists).map((t) => t.name)).toEqual([
      'comptes_locataires',
      'reclamations'
    ])
  })
})
