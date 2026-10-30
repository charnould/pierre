import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  type BulkOperationDefinition,
  emptyBulkOperationDefinition
} from '../../../../../shared/bulk-operations'
import {
  BulkOperationsError,
  create_bulk_operation,
  delete_bulk_operation,
  get_bulk_operation,
  list_bulk_operations,
  update_bulk_operation
} from '../../../../utils/bulk/store'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'
import { writeSetup } from '../../../../utils/setup-store'
import { repaymentSchedule, seedInstanceSetup } from '../../../seed-setup'

const paths = testDatastorePaths('bulk_operations_store')

function seed_mouvements() {
  const db = new Database(`${paths.root}/datastore.sqlite`)
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
    `INSERT INTO comptes_locataires VALUES ('LOC-1', 'CLI-1', 120, 'ada@exemple.fr', '+33612345678')`
  )
  db.close()
}

const insert_job = (bulkOperationId: string, status = 'in_progress') => {
  using db = new Database(paths.database)
  db.run(
    `INSERT INTO bulk_jobs (
       id, bulk_operation_id, execution_id, item_id, source, mode, report_status, payload
     ) VALUES (?, ?, ?, ?, 'comptes_locataires', 'send', ?, '{}')`,
    [Bun.randomUUIDv7(), bulkOperationId, Bun.randomUUIDv7(), Bun.randomUUIDv7(), status]
  )
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
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(paths.root, { recursive: true })
  await setup()
  await seedInstanceSetup()
  seed_mouvements()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
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

  it('verrouille seulement une modification réelle de définition pendant un run actif', () => {
    const created = create_bulk_operation('alice', body)
    insert_job(created.id)

    let conflict: unknown
    try {
      update_bulk_operation(created.id, 'bob', {
        definition: { ...definition, amountRange: { from: '10' } }
      })
    } catch (error) {
      conflict = error
    }
    expect(conflict).toBeInstanceOf(BulkOperationsError)
    expect((conflict as BulkOperationsError).code).toBe('conflict')

    expect(update_bulk_operation(created.id, 'bob', { name: 'Nouveau nom' }).name).toBe(
      'Nouveau nom'
    )
    expect(update_bulk_operation(created.id, 'bob', { definition }).definition).toEqual(definition)

    using db = new Database(paths.database)
    db.run("UPDATE bulk_jobs SET report_status = 'ok' WHERE bulk_operation_id = ?", [created.id])
    expect(
      update_bulk_operation(created.id, 'bob', {
        definition: { ...definition, amountRange: { from: '10' } }
      }).definition.amountRange
    ).toEqual({ from: '10' })
  })

  it('relit une définition valide après une évolution du catalogue', async () => {
    const taggedDefinition = { ...definition, requiredTags: ['décès'] }
    const created = create_bulk_operation('alice', {
      ...body,
      definition: taggedDefinition
    })

    await writeSetup(
      'repayment',
      new TextEncoder().encode(
        JSON.stringify({
          buckets: [
            { id: 'non_traites', label: 'Non traités' },
            { id: 'amiable', label: 'Amiable' },
            { id: 'clients_partis', label: 'Partis' }
          ],
          actions: {
            dossier: ['Analyser le dossier'],
            bulk_operations: ['Envoyer un RCS de relance']
          },
          tags: ['+65 ans', 'Redémarrage APL'],
          template_groups: ['RCS'],
          templates: ['note.md'],
          create_plan: { schedule: repaymentSchedule }
        })
      )
    )

    expect(get_bulk_operation(created.id)?.definition.requiredTags).toEqual(['décès'])
    expect(() =>
      update_bulk_operation(created.id, 'bob', {
        definition: { ...taggedDefinition, requiredTags: ['tag_inconnu'] }
      })
    ).toThrow()
  })
})
