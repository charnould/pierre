import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  CORE_DATA_CONTRACT,
  DATASTORE_TABLES,
  type DatastoreTableStatus,
  get_datastore_tables
} from '../../../utils/datastore-tables'
import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('datastore_tables')
const DATASTORE_SQLITE = `${paths.root}/datastore.sqlite`

const all_missing = (): DatastoreTableStatus[] =>
  [...DATASTORE_TABLES].sort((a, b) => a.localeCompare(b)).map((name) => ({ name, exists: false }))

beforeAll(() => {
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

describe('get_datastore_tables', () => {
  it('exposes the canonical Core Data contract in business order', () => {
    expect(
      CORE_DATA_CONTRACT.map(({ table, filename, label }) => ({ table, filename, label }))
    ).toEqual([
      {
        table: 'lots_locatifs',
        filename: 'core.lots_locatifs.csv',
        label: 'Patrimoine locatif et occupation courante'
      },
      {
        table: 'reclamations',
        filename: 'core.reclamations.csv',
        label: 'Réclamations, demandes et relation client'
      },
      {
        table: 'comptes_locataires',
        filename: 'core.comptes_locataires.csv',
        label: 'Écritures comptables des locataires'
      },
      {
        table: 'travaux',
        filename: 'core.travaux.csv',
        label: 'Bons de travaux et interventions'
      },
      {
        table: 'candidats',
        filename: 'core.candidats.csv',
        label: 'Candidats à l’attribution'
      }
    ])
  })

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

  it('marks only imported tables as present and sorts present rows first', async () => {
    const db = new Database(DATASTORE_SQLITE)
    try {
      await import_json_rows(db, 'reclamations', [
        { id_reclamation: 'REQ-1', id_locataire: 'LOC-A', id_lot: 'LOT-1' }
      ])
      await import_json_rows(db, 'comptes_locataires', [
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
      'candidats',
      'lots_locatifs',
      'travaux'
    ])
    expect(result.tables.filter((t) => t.exists).map((t) => t.name)).toEqual([
      'comptes_locataires',
      'reclamations'
    ])
  })
})
