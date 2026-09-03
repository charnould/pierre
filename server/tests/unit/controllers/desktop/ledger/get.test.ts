import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as getLedger } from '../../../../../controllers/desktop/ledger/get'
import { authenticate } from '../../../../../utils/authenticate-user'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { datastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const SERVICE = '_test_ledger_controller'
const originalService = Bun.env['SERVICE']
const paths = datastorePaths(SERVICE)

const route = new Hono()
route.get('/desktop/ledger', authenticate, getLedger)

const controller = new Hono()
controller.get('/desktop/ledger', getLedger)

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await setup()
  const db = new Database(paths.database)
  import_json_rows(db, 'comptes_locataires', [
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
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
})

describe('GET /desktop/ledger', () => {
  it('requires an authenticated desktop session', async () => {
    const response = await route.request('/desktop/ledger')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

  it('returns the paginated ledger contract without mutating it', async () => {
    const first = await controller.request('/desktop/ledger?limit=1&offset=0')
    const second = await controller.request('/desktop/ledger?limit=1&offset=0')
    expect(first.status).toBe(200)
    expect(await first.clone().json()).toEqual(await second.json())
    expect(await first.json()).toMatchObject({
      data: [{ id_locataire: 'LOC-1', solde_locataire: 150 }],
      meta: { total: 1, limit: 1, offset: 0, snapshot_date: '2030-01-31' }
    })
  })

  it('rejects invalid pagination, sort and filter columns', async () => {
    expect((await controller.request('/desktop/ledger?limit=0')).status).toBe(400)
    expect((await controller.request('/desktop/ledger?limit=1&limit=2')).status).toBe(400)
    expect((await controller.request('/desktop/ledger?sort=unknown')).status).toBe(400)
    expect((await controller.request('/desktop/ledger?unknown=value')).status).toBe(400)
  })
})
