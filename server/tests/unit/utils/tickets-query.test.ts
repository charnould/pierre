import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'
import { setup } from '../../../utils/setup'
import {
  DEFAULT_TICKETS_SORT,
  get_ticket_column_facets,
  list_tickets,
  TicketsPaginationQuery,
  TicketsQueryError,
  TicketsSchemaError
} from '../../../utils/tickets-query'

const TEST_SERVICE = '_test_tickets_query_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`
const DATASTORE_SQLITE = `${DATASTORE_ROOT}/datastore.sqlite`

export const FIXTURE_ROWS = [
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

const seed_tickets = async (rows = FIXTURE_ROWS): Promise<void> => {
  const db = new Database(DATASTORE_SQLITE)
  try {
    await import_json_rows(db, 'reclamations', rows)
  } finally {
    db.close()
  }
}

const table_columns = (): { name: string; type: string }[] => {
  const db = new Database(DATASTORE_SQLITE, { readonly: true })
  try {
    return db.query<{ name: string; type: string }, []>('PRAGMA table_info("reclamations")').all()
  } finally {
    db.close()
  }
}

const insert_ticket_bucket = (
  idReclamation: string,
  bucket: string,
  dateCreation: string
): void => {
  const db = new Database(DATASTORE_SQLITE)
  try {
    db.run(
      `INSERT INTO activites (
         date_creation, date_statut, rattachement, auteur, type, statut, mentions, contenu
       ) VALUES (?, ?, ?, 'user:test', 'case_bucket_change', 'logged', '[]', ?)`,
      [
        dateCreation,
        dateCreation,
        `tickets:${idReclamation}`,
        JSON.stringify({ version: 1, bucket_precedent: null, bucket })
      ]
    )
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

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('list_tickets', () => {
  beforeEach(async () => {
    await mkdir(DATASTORE_ROOT, { recursive: true })
    await setup()
  })

  it('returns empty list when tickets table is missing', () => {
    new Database(DATASTORE_SQLITE).close()
    const result = list_tickets({ ...TicketsPaginationQuery.parse({}), filters: {} })
    expect(result.data).toEqual([])
    expect(result.meta).toEqual({
      total: 0,
      limit: 50,
      offset: 0,
      columns: [],
      default_sort: DEFAULT_TICKETS_SORT
    })
  })

  it('returns schema meta when table exists but has no rows', () => {
    const db = new Database(DATASTORE_SQLITE)
    db.run(
      'CREATE TABLE reclamations (id_reclamation TEXT, id_locataire TEXT, id_lot TEXT, motif TEXT, type_affaire TEXT)'
    )
    db.close()

    const result = list_tickets({ ...TicketsPaginationQuery.parse({}), filters: {} })
    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
    expect(result.meta.columns.map((c) => c.name)).toEqual([
      'id_reclamation',
      'id_locataire',
      'id_lot',
      'motif',
      'type_affaire'
    ])
    expect(result.meta.default_sort).toBe(DEFAULT_TICKETS_SORT)
  })

  it('returns all rows without filters', async () => {
    await seed_tickets()
    const result = list_tickets({ ...TicketsPaginationQuery.parse({}), filters: {} })
    expect(result.data).toHaveLength(4)
    expect(result.data.every((row) => row['pierre_bucket'] === 'non_traitees')).toBe(true)
    expect(result.meta.total).toBe(4)
    expect(result.meta.columns).toEqual(table_columns().map(({ name, type }) => ({ name, type })))
  })

  it('respects limit', async () => {
    await seed_tickets()
    const result = list_tickets({
      ...TicketsPaginationQuery.parse({ limit: 2 }),
      filters: {}
    })
    expect(result.data).toHaveLength(2)
    expect(result.meta.limit).toBe(2)
    expect(result.meta.total).toBe(4)
  })

  it('respects offset', async () => {
    await seed_tickets()
    const sorted = list_tickets({
      ...TicketsPaginationQuery.parse({ sort: 'id_reclamation', limit: 10 }),
      filters: {}
    })
    const paged = list_tickets({
      ...TicketsPaginationQuery.parse({ sort: 'id_reclamation', limit: 2, offset: 1 }),
      filters: {}
    })
    expect(paged.data[0]?.id_reclamation).toBe(sorted.data[1]?.id_reclamation)
  })

  it('falls back to non_traitees for an unknown stored bucket', async () => {
    await seed_tickets()
    insert_ticket_bucket('REQ-1', 'ancien_panier', '2026-01-01T10:00:00Z')

    const result = list_tickets({
      ...TicketsPaginationQuery.parse({ bucket: 'non_traitees' }),
      filters: {}
    })

    expect(result.data.map((row) => row['id_reclamation'])).toContain('REQ-1')
  })

  it('rejects an unknown requested ticket bucket', async () => {
    await seed_tickets()
    expect(() =>
      list_tickets({
        ...TicketsPaginationQuery.parse({ bucket: 'inconnu' }),
        filters: {}
      })
    ).toThrow(TicketsQueryError)
  })

  it('filters by id_reclamation', async () => {
    await seed_tickets()
    const result = list_tickets({
      ...TicketsPaginationQuery.parse({}),
      filters: { id_reclamation: ['REQ-2'] }
    })
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.id_reclamation).toBe('REQ-2')
  })

  it('filters by schema column motif', async () => {
    await seed_tickets()
    const result = list_tickets({
      ...TicketsPaginationQuery.parse({}),
      filters: { motif: ['fuite'] }
    })
    expect(result.data).toHaveLength(2)
    expect(result.data.every((r) => r.motif === 'fuite')).toBe(true)
  })

  it('filters with IN for multiple values on one column', async () => {
    await seed_tickets()
    const result = list_tickets({
      ...TicketsPaginationQuery.parse({}),
      filters: { motif: ['fuite', 'chauffage'] }
    })
    expect(result.data).toHaveLength(3)
  })

  it('combines filters with AND logic', async () => {
    await seed_tickets()
    const result = list_tickets({
      ...TicketsPaginationQuery.parse({}),
      filters: { id_locataire: ['LOC-B'], motif: ['fuite'] }
    })
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.id_reclamation).toBe('REQ-3')
  })

  it('rejects unknown filter column', async () => {
    await seed_tickets()
    expect(() =>
      list_tickets({
        ...TicketsPaginationQuery.parse({}),
        filters: { unknown_col: ['x'] }
      })
    ).toThrow(TicketsQueryError)
  })

  it('sorts descending by id_reclamation by default', async () => {
    await seed_tickets()
    const result = list_tickets({ ...TicketsPaginationQuery.parse({}), filters: {} })
    expect(result.data.map((r) => r.id_reclamation)).toEqual(['REQ-4', 'REQ-3', 'REQ-2', 'REQ-1'])
    expect(result.meta.default_sort).toBe('-id_reclamation')
  })

  it('sorts by schema column motif ascending', async () => {
    await seed_tickets()
    const result = list_tickets({
      ...TicketsPaginationQuery.parse({ sort: 'motif' }),
      filters: {}
    })
    expect(result.data.map((r) => r.motif)).toEqual(['ascenseur', 'chauffage', 'fuite', 'fuite'])
  })

  it('rejects sort on absent column', async () => {
    await seed_tickets()
    expect(() =>
      list_tickets({
        ...TicketsPaginationQuery.parse({ sort: 'missing_col' }),
        filters: {}
      })
    ).toThrow(TicketsQueryError)
  })

  it('throws when core column is missing from schema', () => {
    const db = new Database(DATASTORE_SQLITE)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT, motif TEXT)')
    db.close()

    expect(() => list_tickets({ ...TicketsPaginationQuery.parse({}), filters: {} })).toThrow(
      TicketsSchemaError
    )
  })
})

describe('get_ticket_column_facets', () => {
  beforeEach(async () => {
    await mkdir(DATASTORE_ROOT, { recursive: true })
  })

  it('returns distinct motif values from full table', async () => {
    await seed_tickets()
    const result = get_ticket_column_facets({ column: 'motif' })
    expect(result.values).toEqual(['ascenseur', 'chauffage', 'fuite'])
    expect(result.total).toBe(3)
    expect(result.filterable).toBe(true)
  })

  it('filters facet values with q prefix while total stays full-table distinct count', async () => {
    await seed_tickets()
    const result = get_ticket_column_facets({ column: 'motif', q: 'f' })
    expect(result.values).toEqual(['fuite'])
    expect(result.total).toBe(3)
    expect(result.filterable).toBe(true)
  })

  it('returns filterable true at exactly 99 distinct values', async () => {
    const rows = Array.from({ length: 99 }, (_, i) => ({
      id_reclamation: `REQ-${i + 1}`,
      id_locataire: 'LOC-A',
      id_lot: 'LOT-1',
      motif: `motif-${i + 1}`
    }))
    await seed_tickets(rows)
    const result = get_ticket_column_facets({ column: 'motif' })
    expect(result.total).toBe(99)
    expect(result.filterable).toBe(true)
    expect(result.values).toHaveLength(99)
  })

  it('returns filterable false and empty values without q when distinct count exceeds 99', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      id_reclamation: `REQ-${i + 1}`,
      id_locataire: 'LOC-A',
      id_lot: 'LOT-1',
      motif: `motif-${i + 1}`
    }))
    await seed_tickets(rows)
    const result = get_ticket_column_facets({ column: 'motif' })
    expect(result.total).toBe(100)
    expect(result.filterable).toBe(false)
    expect(result.values).toEqual([])
  })

  it('returns search results with q when distinct count exceeds 99', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      id_reclamation: `REQ-${i + 1}`,
      id_locataire: 'LOC-A',
      id_lot: 'LOT-1',
      motif: i === 50 ? 'fuite-special' : `motif-${i + 1}`
    }))
    await seed_tickets(rows)
    const result = get_ticket_column_facets({ column: 'motif', q: 'fuite' })
    expect(result.filterable).toBe(false)
    expect(result.total).toBe(100)
    expect(result.values).toEqual(['fuite-special'])
  })

  it('returns filterable true with empty values when table is missing', () => {
    const db = new Database(DATASTORE_SQLITE)
    db.close()
    const result = get_ticket_column_facets({ column: 'motif' })
    expect(result).toEqual({
      column: 'motif',
      values: [],
      total: 0,
      filterable: true
    })
  })
})

describe('TicketsPaginationQuery validation', () => {
  it('rejects limit=0', () => {
    expect(TicketsPaginationQuery.safeParse({ limit: 0 }).success).toBe(false)
  })

  it('rejects limit=1001', () => {
    expect(TicketsPaginationQuery.safeParse({ limit: 1001 }).success).toBe(false)
  })

  it('accepts limit=378', () => {
    expect(TicketsPaginationQuery.safeParse({ limit: 378 }).success).toBe(true)
  })

  it('rejects negative offset', () => {
    expect(TicketsPaginationQuery.safeParse({ offset: -1 }).success).toBe(false)
  })

  it('applies pagination defaults when params are omitted', () => {
    const parsed = TicketsPaginationQuery.parse({})
    expect(parsed.limit).toBe(50)
    expect(parsed.offset).toBe(0)
    expect(parsed.sort).toBeUndefined()
  })
})
