import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../../controllers/desktop/ledger/get.facets'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { datastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const SERVICE = '_test_ledger_facets_controller'
const originalService = Bun.env['SERVICE']
const paths = datastorePaths(SERVICE)
const app = new Hono()
app.get('/desktop/ledger/facets', controller)

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await setup()
  const db = new Database(paths.database)
  await import_json_rows(db, 'comptes_locataires', [
    {
      id_client: 'CLIENT-1',
      id_locataire: 'LOC-1',
      montant_en_euros: 100,
      categorie: 'Loyer'
    },
    {
      id_client: 'CLIENT-2',
      id_locataire: 'LOC-2',
      montant_en_euros: 200,
      categorie: 'Frais'
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

describe('GET /desktop/ledger/facets', () => {
  it('returns distinct values and supports prefix search', async () => {
    const response = await app.request('/desktop/ledger/facets?column=categorie&q=lo')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      column: 'categorie',
      values: ['Loyer'],
      total: 2,
      filterable: true
    })
  })

  it('returns structured validation errors', async () => {
    for (const query of [
      '',
      '?column=',
      '?column=unknown',
      '?column=categorie&column=statut',
      '?column=categorie&extra=true'
    ]) {
      const response = await app.request(`/desktop/ledger/facets${query}`)
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'invalid_query' } })
    }
  })
})
