import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_desktop_tickets } from '../../../../../controllers/desktop/tickets/get'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { datastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'
import { upsert_ticket_draft } from '../../../../../utils/ticket-activities'
import { DEFAULT_TICKETS_SORT } from '../../../../../utils/tickets-query'

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
  },
  {
    id_reclamation: 'REQ-3',
    id_locataire: 'LOC-B',
    id_lot: 'LOT-1',
    motif: 'fuite',
    type_affaire: 'sinistre'
  },
  {
    id_reclamation: 'REQ-4',
    id_locataire: 'LOC-B',
    id_lot: 'LOT-3',
    motif: 'ascenseur',
    type_affaire: 'technique'
  }
]

const TEST_SERVICE = '_test_tickets_api_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const TEST_PATHS = datastorePaths(TEST_SERVICE)
const DATASTORE_ROOT = TEST_PATHS.root
const DATASTORE_SQLITE = TEST_PATHS.database

const app = new Hono()
app.get('/desktop/tickets', get_desktop_tickets)

const seed_tickets = (): void => {
  const db = new Database(DATASTORE_SQLITE)
  try {
    import_json_rows(db, 'reclamations', FIXTURE_ROWS)
  } finally {
    db.close()
  }
}

const fetch_tickets = (query = ''): Promise<Response> =>
  Promise.resolve(app.fetch(new Request(`http://localhost/desktop/tickets${query}`)))

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

describe('GET /desktop/tickets', () => {
  it('returns 200 with data, schema meta and default_sort', async () => {
    seed_tickets()
    const res = await fetch_tickets()
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      data: { id_reclamation: string }[]
      meta: {
        total: number
        limit: number
        offset: number
        columns: { name: string; type: string }[]
        default_sort: string
      }
    }
    expect(body.data).toHaveLength(4)
    expect(body.meta.total).toBe(4)
    expect(body.meta.default_sort).toBe(DEFAULT_TICKETS_SORT)
    expect(body.meta.columns.map((c) => c.name)).toEqual([
      'id_reclamation',
      'id_locataire',
      'id_lot',
      'motif',
      'type_affaire'
    ])
  })

  it('paginates with limit query param', async () => {
    seed_tickets()
    const res = await fetch_tickets('?limit=2')
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } }
    expect(body.data).toHaveLength(2)
    expect(body.meta.total).toBe(4)
  })

  it('filters by id_reclamation', async () => {
    seed_tickets()
    const res = await fetch_tickets('?id_reclamation=REQ-2')
    const body = (await res.json()) as { data: { id_reclamation: string }[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.id_reclamation).toBe('REQ-2')
  })

  it('filters by schema column motif', async () => {
    seed_tickets()
    const res = await fetch_tickets('?id_locataire=LOC-B&motif=fuite')
    const body = (await res.json()) as { data: { id_reclamation: string }[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.id_reclamation).toBe('REQ-3')
  })

  it('returns 400 for limit above max', async () => {
    seed_tickets()
    const res = await fetch_tickets('?limit=1001')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('invalid_query')
  })

  it('accepts custom limit 378', async () => {
    seed_tickets()
    const res = await fetch_tickets('?limit=378')
    expect(res.status).toBe(200)
  })

  it('filters with repeated query params (IN)', async () => {
    seed_tickets()
    const res = await fetch_tickets('?motif=fuite&motif=chauffage')
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(3)
  })

  it('applies structured rules sent by the desktop', async () => {
    seed_tickets()
    const rules = encodeURIComponent(
      JSON.stringify([{ kind: 'values', column: 'type_affaire', values: ['sinistre'] }])
    )
    const res = await fetch_tickets(`?rules=${rules}`)
    const body = (await res.json()) as { data: { id_reclamation: string }[] }
    expect(res.status).toBe(200)
    expect(body.data.map((row) => row.id_reclamation)).toEqual(['REQ-3', 'REQ-1'])
  })

  it('rejects malformed structured rules', async () => {
    seed_tickets()
    const res = await fetch_tickets('?rules=not-json')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: { code: 'invalid_query', message: 'rules must be a valid JSON array' }
    })
  })

  it('returns 400 for invalid sort column', async () => {
    seed_tickets()
    const res = await fetch_tickets('?sort=bad')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('invalid_query')
  })

  it('returns 400 for unknown filter column', async () => {
    seed_tickets()
    const res = await fetch_tickets('?unknown_col=x')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('invalid_query')
  })

  it('returns empty list when table is missing', async () => {
    new Database(DATASTORE_SQLITE).close()
    const res = await fetch_tickets()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: unknown[]
      meta: { total: number; columns: unknown[]; default_sort: string }
    }
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
    expect(body.meta.columns).toEqual([])
    expect(body.meta.default_sort).toBe(DEFAULT_TICKETS_SORT)
  })

  it('returns last row with offset beyond first page', async () => {
    seed_tickets()
    const res = await fetch_tickets('?offset=3&limit=10&sort=id_reclamation')
    const body = (await res.json()) as { data: { id_reclamation: string }[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.id_reclamation).toBe('REQ-4')
  })

  it('includes draft_id_skills on ticket rows', async () => {
    seed_tickets()
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      channel: 'email',
      generated_output: 'o',
      generated_by: 'u@x.com'
    })
    const res = await fetch_tickets('?id_reclamation=REQ-1')
    const body = (await res.json()) as {
      data: { id_reclamation: string; draft_id_skills?: string[] }[]
    }
    expect(body.data[0]?.draft_id_skills).toEqual(['ticket.answer-ticket'])
  })
})
