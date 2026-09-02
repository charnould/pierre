import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_desktop_datastore_tables } from '../../../../../controllers/desktop/datastore/get.tables'
import { DATASTORE_TABLES, type DatastoreTablesResult } from '../../../../../utils/datastore-tables'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { setup } from '../../../../../utils/setup'

const TEST_SERVICE = '_test_datastore_tables_api_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`
const DATASTORE_SQLITE = `${DATASTORE_ROOT}/datastore.sqlite`

const app = new Hono()
app.get('/desktop/datastore/tables', get_desktop_datastore_tables)

const fetch_tables = (): Promise<Response> =>
  Promise.resolve(app.fetch(new Request('http://localhost/desktop/datastore/tables')))

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
      import_json_rows(db, 'travaux', [{ id_travaux: 'TRV-1' }])
    } finally {
      db.close()
    }

    const res = await fetch_tables()
    expect(res.status).toBe(200)

    const body = (await res.json()) as DatastoreTablesResult

    expect(body.tables.find((row) => row.name === 'travaux')?.exists).toBe(true)
    expect(body.tables.filter((row) => row.exists)).toHaveLength(1)
  })
})
