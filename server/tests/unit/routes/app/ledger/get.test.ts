import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { listLedger as getLedger } from '../../../../../routes/ledger'
import { authenticate } from '../../../../../utils/authenticate-user'
import { import_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const paths = testDatastorePaths('ledger_controller')

const route = new Hono()
route.get('/ledger', authenticate, getLedger)

const controller = new Hono()
controller.get('/ledger', getLedger)
controller.get('/ledger/meta', getLedger)

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await setup()
  const db = new Database(paths.database)
  await import_rows(db, 'comptes_locataires', [
    {
      id_client: 'CLIENT-1',
      id_locataire: 'LOC-1',
      montant_en_euros: 150,
      date_extraction: '2030-01-31'
    }
  ])
  db.close()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

afterAll(() => {
  setDatastoreRoot(null)
})

describe('GET /ledger', () => {
  it('requires an authenticated app session', async () => {
    const response = await route.request('/ledger')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

  it('returns the paginated ledger contract without mutating it', async () => {
    const first = await controller.request('/ledger?limit=1&offset=0')
    const second = await controller.request('/ledger?limit=1&offset=0')
    expect(first.status).toBe(200)
    expect(await first.clone().json()).toEqual(await second.json())
    expect(await first.json()).toMatchObject({
      data: [{ id_locataire: 'LOC-1', solde_locataire: 150 }],
      meta: { total: 1, limit: 1, offset: 0, snapshotDate: '2030-01-31' }
    })
  })

  it('returns metadata without ledger rows on the metadata route', async () => {
    const response = await controller.request('/ledger/meta?limit=1')
    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, unknown>
    expect(body).not.toHaveProperty('data')
    expect(body).toHaveProperty('meta')
  })

  it('rejects invalid pagination, sort and filter columns', async () => {
    expect((await controller.request('/ledger?limit=0')).status).toBe(400)
    expect((await controller.request('/ledger?limit=1&limit=2')).status).toBe(400)
    expect((await controller.request('/ledger?sort=unknown')).status).toBe(400)
    expect((await controller.request('/ledger?unknown=value')).status).toBe(400)
  })
})
