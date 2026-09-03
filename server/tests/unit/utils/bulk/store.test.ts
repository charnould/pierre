import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  emptyBulkOperationDefinition,
  type BulkOperationDefinition
} from '../../../../../shared/bulk-operations'
import {
  create_bulk_operation,
  delete_bulk_operation,
  get_bulk_operation,
  list_bulk_operations,
  update_bulk_operation
} from '../../../../utils/bulk/store'
import { setup } from '../../../../utils/setup'

const TEST_SERVICE = '_test_bulk_operations_store'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

function seed_mouvements() {
  const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`)
  db.run(`
    CREATE TABLE comptes_locataires (
      id_locataire TEXT,
      id_client TEXT,
      montant_en_euros REAL,
      email_client TEXT,
      telephone_client TEXT
    )
  `)
  db.run(
    `INSERT INTO comptes_locataires VALUES ('LOC-1', 'CLI-1', 120, 'ada@exemple.fr', '0612345678')`
  )
  db.close()
}

const definition = {
  ...emptyBulkOperationDefinition(),
  delivery: {
    kind: 'fallback' as const,
    steps: [
      {
        medium: 'sms' as const,
        body: 'Bonjour {{id_locataire}}',
        placeholderBindings: { id_locataire: 'id_locataire' },
        action: 'Relancer par SMS'
      }
    ]
  }
} satisfies BulkOperationDefinition

const body = {
  name: 'Relance SMS',
  description: 'Lot amiable',
  definition
}

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
  seed_mouvements()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('bulk store', () => {
  it('crée, liste, met à jour et supprime', () => {
    const created = create_bulk_operation('alice', body)
    expect(created.name).toBe('Relance SMS')
    expect(created.definition.delivery.kind).toBe('fallback')
    expect(created.reportsToKeep).toBe(10)
    expect(created.edits).toHaveLength(1)
    expect(created.edits[0]?.by).toBe('alice')
    expect(created.lastRunAt).toBeNull()
    expect(list_bulk_operations()).toEqual([
      expect.not.objectContaining({ definition: expect.anything() })
    ])

    const updated = update_bulk_operation(created.id, 'bob', {
      name: 'Relance mise à jour',
      definition: { ...definition, amountRange: { from: '10' } },
      reportsToKeep: 3
    })
    expect(updated.name).toBe('Relance mise à jour')
    expect(updated.definition.amountRange).toEqual({ from: '10' })
    expect(updated.reportsToKeep).toBe(3)
    expect(updated.edits).toHaveLength(2)
    expect(updated.edits[1]?.by).toBe('bob')
    expect(get_bulk_operation(created.id)?.name).toBe('Relance mise à jour')

    delete_bulk_operation(created.id)
    expect(list_bulk_operations()).toHaveLength(0)
    expect(get_bulk_operation(created.id)).toBeNull()
  })

  it('refuse reportsToKeep inférieur à un', () => {
    expect(() => create_bulk_operation('alice', { ...body, reportsToKeep: 0 })).toThrow()
  })

  it('enregistre un courrier sans fichier', () => {
    const created = create_bulk_operation('alice', {
      name: 'Relance courrier',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'courrier',
              action: 'R1',
              filename: '',
              fileBase64: '',
              placeholders: [],
              placeholderBindings: {},
              summary: ''
            }
          ]
        }
      }
    })
    expect(created.definition.delivery).toEqual({
      kind: 'fallback',
      steps: [
        {
          medium: 'courrier',
          action: 'R1',
          filename: '',
          fileBase64: '',
          placeholders: [],
          placeholderBindings: {},
          summary: ''
        }
      ]
    })
  })
})
