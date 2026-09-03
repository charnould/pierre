import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_desktop_tickets_facets } from '../../../../../controllers/desktop/tickets/get.facets'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'

const FIXTURE_ROWS = [
  {
    id_reclamation: 'REQ-1',
    id_locataire: 'LOC-A',
    id_lot: 'LOT-1',
    motif: 'fuite',
    type_affaire: 'sinistre'
  },
  {
    id_reclamation: 'REQ-2',
    id_locataire: 'LOC-A',
    id_lot: 'LOT-2',
    motif: 'chauffage',
    type_affaire: 'technique'
  }
]

const TEST_SERVICE = '_test_tickets_facets_api_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`
const DATASTORE_SQLITE = `${DATASTORE_ROOT}/datastore.sqlite`

const app = new Hono()
app.get('/desktop/tickets/facets', get_desktop_tickets_facets)

const seed_tickets = async (): Promise<void> => {
  const db = new Database(DATASTORE_SQLITE)
  try {
    await import_json_rows(db, 'reclamations', FIXTURE_ROWS)
  } finally {
    db.close()
  }
}

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
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('GET /desktop/tickets/facets', () => {
  it('returns distinct values for a column', async () => {
    await seed_tickets()
    const res = await app.fetch(new Request('http://localhost/desktop/tickets/facets?column=motif'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      column: string
      values: string[]
      total: number
      filterable: boolean
    }
    expect(body.column).toBe('motif')
    expect(body.values).toEqual(['chauffage', 'fuite'])
    expect(body.total).toBe(2)
    expect(body.filterable).toBe(true)
  })

  it('returns filterable false when column has more than 99 distinct values', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      id_reclamation: `REQ-${i + 1}`,
      id_locataire: 'LOC-A',
      id_lot: 'LOT-1',
      motif: `motif-${i + 1}`
    }))
    const db = new Database(DATASTORE_SQLITE)
    try {
      await import_json_rows(db, 'reclamations', rows)
    } finally {
      db.close()
    }

    const res = await app.fetch(new Request('http://localhost/desktop/tickets/facets?column=motif'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      values: string[]
      total: number
      filterable: boolean
    }
    expect(body.total).toBe(100)
    expect(body.filterable).toBe(false)
    expect(body.values).toEqual([])
  })

  it('returns search matches when column exceeds 99 distinct values and q is provided', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      id_reclamation: `REQ-${i + 1}`,
      id_locataire: 'LOC-A',
      id_lot: 'LOT-1',
      motif: i === 0 ? 'fuite-unique' : `motif-${i + 1}`
    }))
    const db = new Database(DATASTORE_SQLITE)
    try {
      await import_json_rows(db, 'reclamations', rows)
    } finally {
      db.close()
    }

    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets/facets?column=motif&q=fuite')
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { values: string[]; filterable: boolean }
    expect(body.filterable).toBe(false)
    expect(body.values).toEqual(['fuite-unique'])
  })

  it('returns 400 when column is missing', async () => {
    await seed_tickets()
    const res = await app.fetch(new Request('http://localhost/desktop/tickets/facets'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown column', async () => {
    await seed_tickets()
    const res = await app.fetch(new Request('http://localhost/desktop/tickets/facets?column=bad'))
    expect(res.status).toBe(400)
  })
})
