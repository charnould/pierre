import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { create_trusted_activity } from '../../../utils/activities/write'
import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'
import {
  get_ledger_column_facets,
  list_ledger_balances,
  list_ledger_movements
} from '../../../utils/ledger/query'
import { LedgerPaginationQuery, LedgerQueryError } from '../../../utils/ledger/schema'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const SERVICE_A = '_test_ledger_query_a'
const SERVICE_B = '_test_ledger_query_b'
const originalService = Bun.env['SERVICE']

const seed = (
  service: string,
  movements: Record<string, unknown>[],
  lots: Record<string, unknown>[] = []
): Promise<void> => {
  const db = new Database(datastorePaths(service).database)
  return import_json_rows(db, 'comptes_locataires', movements)
    .then(() => (lots.length > 0 ? import_json_rows(db, 'lots_locatifs', lots) : undefined))
    .finally(() => db.close())
}

const movement = (
  idLocataire: string,
  amount: unknown,
  date: string,
  extra: Record<string, unknown> = {}
) => ({
  id_client: `CLIENT-${idLocataire}`,
  id_locataire: idLocataire,
  montant_en_euros: amount,
  date_exigibilite: date,
  date_extraction: '2030-01-31',
  ...extra
})

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE_A
})

beforeEach(async () => {
  for (const service of [SERVICE_A, SERVICE_B]) {
    await rm(datastorePaths(service).root, { recursive: true, force: true })
    await mkdir(datastorePaths(service).root, { recursive: true })
  }
  Bun.env['SERVICE'] = SERVICE_A
  await setup()
})

afterEach(async () => {
  for (const service of [SERVICE_A, SERVICE_B]) {
    await rm(datastorePaths(service).root, { recursive: true, force: true })
  }
})

afterAll(() => {
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
})

describe('ledger SQL queries', () => {
  it('aggregates positive balances by dossier and uses the latest movement', async () => {
    await seed(
      SERVICE_A,
      [
        movement('LOC-1', 500, '2030-01-01', { id_lot: 'LOT-1', categorie: 'loyer' }),
        movement('LOC-1', -100, '2030-01-12', { id_lot: 'LOT-1', categorie: 'paiement' }),
        movement('LOC-2', 100, '2030-01-01'),
        movement('LOC-2', -100, '2030-01-02')
      ],
      [
        {
          id_client: 'CLIENT-LOC-1',
          id_locataire: 'LOC-1',
          id_lot: 'LOT-1',
          loyer_mensuel_en_euros: 800,
          debut_bail: '2029-01-01'
        }
      ]
    )

    const result = list_ledger_balances({
      ...LedgerPaginationQuery.parse({}),
      filters: {}
    })

    expect(result.data).toEqual([
      expect.objectContaining({
        id_locataire: 'LOC-1',
        solde_locataire: 400,
        categorie: 'paiement',
        statut: 'client',
        ratio_dette_loyer: 0.5,
        debut_bail: '2029-01-01'
      })
    ])
    expect(result.meta).toMatchObject({ total: 1, snapshot_date: '2030-01-31' })
  })

  it('aggregates French money exactly to cents and ignores invalid values', async () => {
    await seed(SERVICE_A, [
      movement('LOC-1', '199,09', '2030-01-01'),
      movement('LOC-1', '1\u202f000,91', '2030-01-02'),
      movement('LOC-1', 'invalid', '2030-01-03'),
      movement('LOC-1', '1,2,3', '2030-01-04')
    ])

    const result = list_ledger_balances({ ...LedgerPaginationQuery.parse({}), filters: {} })
    expect(result.data[0]?.['solde_locataire']).toBe(1_200)
  })

  it('uses chronological ISO/French date keys for latest movement and timeline order', async () => {
    await seed(SERVICE_A, [
      movement('LOC-1', 10, '31/01/2030', { categorie: 'french' }),
      movement('LOC-1', 20, '2030-02-01', { categorie: 'iso' }),
      movement('LOC-1', 30, 'not-a-date', { categorie: 'invalid' })
    ])

    const balance = list_ledger_balances({ ...LedgerPaginationQuery.parse({}), filters: {} })
    expect(balance.data[0]?.['categorie']).toBe('iso')
    expect(list_ledger_movements('LOC-1').data.map((row) => row['categorie'])).toEqual([
      'iso',
      'french',
      'invalid'
    ])
  })

  it('deduplicates historical occupations and lots to one ledger row per dossier', async () => {
    await seed(
      SERVICE_A,
      [
        movement('LOC-OLD', 400, '2030-01-01', { id_lot: 'LOT-1', categorie: 'loyer' }),
        movement('LOC-OTHER', 200, '2030-01-01', { id_lot: 'LOT-2', categorie: 'frais' })
      ],
      [
        {
          id_client: 'CLIENT-OLD',
          id_locataire: 'LOC-OLD',
          id_lot: 'LOT-1',
          loyer_mensuel_en_euros: '700,00',
          debut_bail: '01/01/2020',
          fin_bail: '31/12/2023'
        },
        {
          id_client: 'CLIENT-OLD',
          id_locataire: 'LOC-OLD',
          id_lot: 'LOT-1',
          loyer_mensuel_en_euros: '800,00',
          debut_bail: '01/01/2021',
          fin_bail: '31/12/2024'
        },
        {
          id_client: 'CLIENT-NEW',
          id_locataire: 'LOC-NEW',
          id_lot: 'LOT-1',
          loyer_mensuel_en_euros: '1\u00a0000,00',
          debut_bail: '01/01/2025',
          fin_bail: null
        }
      ]
    )

    const firstPage = list_ledger_balances({
      ...LedgerPaginationQuery.parse({ limit: 1 }),
      filters: {}
    })
    const full = list_ledger_balances({ ...LedgerPaginationQuery.parse({}), filters: {} })
    expect(firstPage.data).toHaveLength(1)
    expect(firstPage.meta.total).toBe(2)
    expect(full.data).toHaveLength(2)
    expect(full.data.find((row) => row['id_locataire'] === 'LOC-OLD')).toEqual(
      expect.objectContaining({
        statut: 'ex-client',
        ratio_dette_loyer: 0.4,
        debut_bail: null,
        fin_bail: null
      })
    )
    expect(get_ledger_column_facets({ column: 'statut' })).toMatchObject({
      values: ['ex-client'],
      total: 1
    })
  })

  it('uses id_locataire as a stable tie-break on every ledger sort', async () => {
    await seed(SERVICE_A, [
      movement('LOC-C', 100, '2030-01-01'),
      movement('LOC-A', 100, '2030-01-01'),
      movement('LOC-B', 100, '2030-01-01')
    ])

    const page = (offset: number) =>
      list_ledger_balances({
        ...LedgerPaginationQuery.parse({ limit: 1, offset, sort: '-solde_locataire' }),
        filters: {}
      }).data[0]?.['id_locataire']
    expect([page(0), page(1), page(2)]).toEqual(['LOC-A', 'LOC-B', 'LOC-C'])
  })

  it('keeps sibling tenant dossiers isolated', async () => {
    await seed(SERVICE_A, [
      movement('LOC-A', 120, '2030-01-01', { id_client: 'CLIENT-1' }),
      movement('LOC-B', 240, '2030-01-02', { id_client: 'CLIENT-1' })
    ])

    const movements = list_ledger_movements('LOC-A')
    expect(movements.data).toHaveLength(1)
    expect(movements.data[0]?.['id_locataire']).toBe('LOC-A')
  })

  it('overlays repayment phase, assignment and last completed action', async () => {
    await seed(SERVICE_A, [movement('LOC-1', 300, '2030-01-01')])
    create_trusted_activity('agent@example.org', {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'case_bucket_change',
      statut: 'logged',
      contenu: JSON.stringify({ version: 1, bucket_precedent: null, bucket: 'amiable' }),
      auteur: 'system:repayment'
    })
    create_trusted_activity('agent@example.org', {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'case_assignment',
      statut: 'logged',
      contenu: JSON.stringify({
        version: 1,
        referent_precedent: null,
        referent: 'agent@example.org'
      }),
      auteur: 'system:repayment'
    })
    create_trusted_activity('agent@example.org', {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'action',
      statut: 'logged',
      contenu: JSON.stringify({ action: 'Relancer', etat: 'fait' }),
      auteur: 'system:repayment'
    })

    expect(
      list_ledger_balances({ ...LedgerPaginationQuery.parse({}), filters: {} }).data[0]
    ).toEqual(
      expect.objectContaining({
        bucket: 'amiable',
        gestionnaire: 'agent@example.org',
        derniere_action_realisee: 'Relancer'
      })
    )
  })

  it('ignores ticket activities carrying the same id_locataire', async () => {
    await seed(SERVICE_A, [movement('LOC-1', 300, '2030-01-01')])
    const db = new Database(datastorePaths(SERVICE_A).database)
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu
       ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?)`,
      [
        '2030-02-01',
        'repayment:LOC-1',
        'system:repayment',
        'LOC-1',
        'case_bucket_change',
        'logged',
        JSON.stringify({ version: 1, bucket_precedent: null, bucket: 'amiable' })
      ]
    )
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu
       ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?)`,
      [
        '2030-03-01',
        'tickets:TICKET-1',
        'system:test',
        'LOC-1',
        'case_bucket_change',
        'logged',
        JSON.stringify({ version: 1, bucket_precedent: 'amiable', bucket: 'contentieux' })
      ]
    )
    db.close()

    expect(
      list_ledger_balances({ ...LedgerPaginationQuery.parse({}), filters: {} }).data[0]?.['bucket']
    ).toBe('amiable')
  })

  it('filters, sorts and facets only declared output columns', async () => {
    await seed(SERVICE_A, [
      movement('LOC-A', 100, '2030-01-01', { categorie: 'loyer' }),
      movement('LOC-B', 200, '2030-01-02', { categorie: 'frais' })
    ])

    const result = list_ledger_balances({
      ...LedgerPaginationQuery.parse({ sort: 'solde_locataire' }),
      filters: { categorie: ['loyer'] }
    })
    expect(result.data.map((row) => row['id_locataire'])).toEqual(['LOC-A'])
    expect(get_ledger_column_facets({ column: 'categorie' }).values).toEqual(['frais', 'loyer'])
    expect(() =>
      list_ledger_balances({
        ...LedgerPaginationQuery.parse({}),
        filters: { 'categorie" OR 1=1 --': ['loyer'] }
      })
    ).toThrow(LedgerQueryError)
  })

  it('uses only the current service datastore', async () => {
    await seed(SERVICE_A, [movement('LOC-A', 100, '2030-01-01')])
    Bun.env['SERVICE'] = SERVICE_B
    await setup()
    await seed(SERVICE_B, [movement('LOC-B', 200, '2030-01-01')])

    expect(
      list_ledger_balances({ ...LedgerPaginationQuery.parse({}), filters: {} }).data.map(
        (row) => row['id_locataire']
      )
    ).toEqual(['LOC-B'])
  })
})
