import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_desktop_datastore_tables } from '../../../../../controllers/desktop/datastore/get.tables'
import { DATASTORE_TABLES, type DatastoreTablesResult } from '../../../../../utils/datastore-tables'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const paths = testDatastorePaths('datastore_tables_api')
const DATASTORE_SQLITE = `${paths.root}/datastore.sqlite`

const app = new Hono()
app.get('/desktop/datastore/tables', get_desktop_datastore_tables)

const fetch_tables = (): Promise<Response> =>
  Promise.resolve(app.fetch(new Request('http://localhost/desktop/datastore/tables')))

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

describe('GET /desktop/datastore/tables', () => {
  it('returns 200 with every canonical table and presence flags', async () => {
    const res = await fetch_tables()
    expect(res.status).toBe(200)

    const body = (await res.json()) as DatastoreTablesResult

    expect(body.tables).toHaveLength(DATASTORE_TABLES.length)
    expect(
      body.tables.every((row) => (DATASTORE_TABLES as readonly string[]).includes(row.name))
    ).toBe(true)
    expect(body.tables.every((row) => row.exists === false)).toBe(true)
  })

  it('returns 200 with imported tables marked present', async () => {
    const db = new Database(DATASTORE_SQLITE)
    try {
      await import_json_rows(db, 'travaux', [{ id_travaux: 'TRV-1' }])
    } finally {
      db.close()
    }

    const res = await fetch_tables()
    expect(res.status).toBe(200)

    const body = (await res.json()) as DatastoreTablesResult

    expect(body.tables.find((row) => row.name === 'travaux')?.exists).toBe(true)
    expect(body.tables.filter((row) => row.exists)).toHaveLength(1)
  })

  it('keeps the desktop datastore tables endpoint registered in the server app', async () => {
    const appSource = await Bun.file(new URL('../../../../../app.ts', import.meta.url)).text()
    expect(appSource).toContain(`'/desktop/datastore/tables'`)
  })
})
