import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  emptyBulkOperationDefinition,
  type BulkOperationDefinition
} from '../../../../../shared/bulk-operations'
import { preview_message, preview_query } from '../../../../utils/bulk/preview'
import { select_fallback_route } from '../../../../utils/bulk/route-policy'
import { insert_contact_if_absent } from '../../../../utils/contacts'
import { setup } from '../../../../utils/setup'

const TEST_SERVICE = '_test_bulk_operations_preview'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
  const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`)
  db.run(`
    CREATE TABLE comptes_locataires (
      id_locataire TEXT, id_client TEXT, id_lot TEXT, date_exigibilite TEXT,
      montant_en_euros REAL, nom_locataire TEXT, email_client TEXT,
      telephone_client TEXT, adresse TEXT
    )
  `)
  db.run(`
    CREATE TABLE lots_locatifs (
      id_locataire TEXT, id_lot TEXT, loyer_mensuel_en_euros REAL
    )
  `)
  db.run(
    `INSERT INTO comptes_locataires VALUES
      ('RCS', 'C1', 'L1', '2026-01-01', 100, 'Ada', 'ada@example.org', '0611111111', '1 rue A'),
      ('EMAIL', 'C2', 'L2', '2026-01-01', 50, 'Bob', 'bob@example.org', NULL, '2 rue B'),
      ('NONE', 'C3', 'L3', '2026-01-01', 20, 'Eve', NULL, NULL, NULL)`
  )
  db.run(
    `INSERT INTO lots_locatifs VALUES
      ('RCS', 'L1', 100), ('EMAIL', 'L2', 100), ('NONE', 'L3', 100)`
  )
  insert_contact_if_absent(db, '+33611111111', 'rcs_compatible')
  insert_contact_if_absent(db, 'ada@example.org', 'ok')
  insert_contact_if_absent(db, 'bob@example.org', 'ok')
  db.close()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

const fallback = (): BulkOperationDefinition => ({
  ...emptyBulkOperationDefinition(),
  delivery: {
    kind: 'fallback',
    steps: [
      {
        medium: 'rcs',
        action: 'RCS',
        body: 'Bonjour {{nom}}',
        placeholderBindings: { nom: 'nom_locataire' }
      },
      {
        medium: 'email',
        action: 'Courriel',
        subject: 'Relance {{id}}',
        body: 'Bonjour {{nom}}',
        placeholderBindings: { id: 'id_locataire', nom: 'nom_locataire' }
      }
    ]
  }
})

describe('bulk preview', () => {
  it('resolves fallback routes without copying content into rows', () => {
    const preview = preview_query({ definition: fallback() })
    expect(preview.rows.find((row) => row.id_locataire === 'RCS')?.route).toEqual({
      kind: 'fallback',
      medium: 'rcs',
      stepIndex: 0
    })
    expect(preview.rows.find((row) => row.id_locataire === 'EMAIL')?.route).toEqual({
      kind: 'fallback',
      medium: 'email',
      stepIndex: 1
    })
    expect(preview.rows.find((row) => row.id_locataire === 'EMAIL')?.skippedSteps[0]).toEqual({
      medium: 'rcs',
      stepIndex: 0,
      reasons: [{ code: 'missing_destination' }]
    })
    expect(preview.rows.find((row) => row.id_locataire === 'NONE')?.route).toBeNull()
  })

  it('uses the same route policy for preview and execution', () => {
    const definition = fallback()
    const preview = preview_query({ definition })
    if (definition.delivery.kind !== 'fallback') throw new Error('fallback attendu')
    for (const row of preview.rows) {
      const executionSelection = select_fallback_route(row, definition.delivery.steps)
      expect(row.route).toEqual(executionSelection.route)
      expect(executionSelection.skippedSteps).toEqual(row.skippedSteps)
    }
  })

  it('renders inline text through explicit bindings', async () => {
    const result = await preview_message({ definition: fallback(), id_locataire: 'EMAIL' })
    expect(result).toMatchObject({
      kind: 'text',
      medium: 'email',
      subject: 'Relance EMAIL',
      rendered: 'Bonjour Bob'
    })
  })

  it('requires RCS compatibility and renders any rich node recursively', async () => {
    const definition: BulkOperationDefinition = {
      ...emptyBulkOperationDefinition(),
      delivery: {
        kind: 'rich_rcs',
        action: 'Relancer',
        replyTimeoutHours: 72,
        placeholderBindings: { nom: 'nom_locataire' },
        nodes: [
          {
            id: 'message_1',
            body: 'Bonjour {{nom}}',
            richContent: {
              conversation: [
                {
                  text: 'Bonjour {{nom}}',
                  suggestions: [{ action: 'Reply', label: 'Suite', postbackdata: 'suite' }]
                }
              ]
            },
            transitions: { suite: 'message_2' }
          },
          {
            id: 'message_2',
            body: 'Suite pour {{nom}}',
            richContent: { conversation: [{ text: 'Suite {{nom}}' }] },
            transitions: {}
          }
        ]
      }
    }
    expect(preview_query({ definition }).totals).toEqual({
      total: 3,
      eligible: 1,
      no_usable_route: 2
    })
    const result = await preview_message({
      definition,
      id_locataire: 'RCS',
      nodeId: 'message_2'
    })
    expect(result).toMatchObject({
      kind: 'rich_rcs',
      nodeId: 'message_2',
      body: 'Suite pour Ada',
      richContent: { conversation: [{ text: 'Suite Ada' }] }
    })
  })
})
