import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import {
  type BulkOperationDefinition,
  emptyBulkOperationDefinition
} from '../../../../../../shared/bulk-operations'
import {
  executeBulkOperation as postExecute,
  listBulkOperationReports as getReports,
  previewBulkQuery as postPreview
} from '../../../../../routes/bulk'
import { execute_bulk_operation } from '../../../../../utils/bulk/send'
import { create_bulk_operation } from '../../../../../utils/bulk/store'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'
import { seedInstanceSetup } from '../../../../seed-setup'

const paths = testDatastorePaths('bulk_report_controllers')

const app = new Hono()
app.use('*', async (c, next) => {
  c.set('user' as never, { email: 'alice@example.org' } as never)
  await next()
})
app.get('/bulk/:id/reports', getReports)
app.post('/bulk/preview/query', postPreview)
app.post('/bulk/:id/execute', postExecute)

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
  db.close()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('bulk report controllers', () => {
  it('retourne la liste et le détail, y compris pour un run vide', async () => {
    const bulk = create_bulk_operation('alice', {
      name: 'Rapport vide',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'email',
              subject: 'Relance',
              body: 'Bonjour',
              placeholderBindings: {},
              action: 'Relancer'
            }
          ]
        }
      }
    })
    const execution = await execute_bulk_operation('alice@example.org', bulk.id, {
      mode: 'send',
      clientCommandId: 'route-empty'
    })
    const listResponse = await app.request(`/bulk/${bulk.id}/reports`)
    expect(listResponse.status).toBe(200)
    const list = (await listResponse.json()) as {
      data: Array<{ report: { executionId: string }; items: unknown[] }>
    }
    expect(list.data.map((detail) => detail.report.executionId)).toEqual([execution.executionId])
    expect(list.data[0]?.items).toEqual([])
  })

  it('retourne 404 pour une opération ou un rapport inconnu', async () => {
    expect((await app.request('/bulk/missing/reports')).status).toBe(404)
  })

  it('retourne not_implemented pour preview et execute des autres sources', async () => {
    const definition: BulkOperationDefinition = {
      ...emptyBulkOperationDefinition(),
      source: 'reclamations' as const,
      delivery: {
        kind: 'fallback',
        steps: [
          {
            medium: 'email' as const,
            subject: 'Relance',
            body: 'Bonjour',
            placeholderBindings: {},
            action: 'Relancer'
          }
        ]
      }
    }
    const bulk = create_bulk_operation('alice', { name: 'Réclamations', definition })
    const preview = await app.request('/bulk/preview/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ definition })
    })
    expect(preview.status).toBe(400)
    expect((await preview.json()) as unknown).toMatchObject({
      error: { code: 'not_implemented' }
    })
    const execute = await app.request(`/bulk/${bulk.id}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'send', clientCommandId: 'unsupported' })
    })
    expect(execute.status).toBe(400)
    expect((await execute.json()) as unknown).toMatchObject({
      error: { code: 'not_implemented' }
    })
  })
})
