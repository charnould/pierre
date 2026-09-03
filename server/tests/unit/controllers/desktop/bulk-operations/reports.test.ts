import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import {
  emptyBulkOperationDefinition,
  type BulkOperationDefinition
} from '../../../../../../shared/bulk-operations'
import { controller as getReport } from '../../../../../controllers/desktop/bulk-operations/get.report'
import { controller as getReports } from '../../../../../controllers/desktop/bulk-operations/get.reports'
import { controller as postExecute } from '../../../../../controllers/desktop/bulk-operations/post.execute'
import { controller as postPreview } from '../../../../../controllers/desktop/bulk-operations/post.preview-query'
import { execute_bulk_operation } from '../../../../../utils/bulk/send'
import { create_bulk_operation } from '../../../../../utils/bulk/store'
import { setup } from '../../../../../utils/setup'

const TEST_SERVICE = '_test_bulk_report_controllers'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const ROOT = `datastores/${TEST_SERVICE}`

const app = new Hono()
app.use('*', async (c, next) => {
  c.set('user' as never, { email: 'alice@example.org' } as never)
  await next()
})
app.get('/desktop/bulk-operations/:id/reports/:executionId', getReport)
app.get('/desktop/bulk-operations/:id/reports', getReports)
app.post('/desktop/bulk-operations/preview-query', postPreview)
app.post('/desktop/bulk-operations/:id/execute', postExecute)

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(ROOT, { recursive: true })
  await setup()
  const db = new Database(`${ROOT}/datastore.sqlite`)
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
  await rm(ROOT, { recursive: true, force: true })
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
    const execution = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'send',
      clientCommandId: 'route-empty'
    })
    const listResponse = await app.request(`/desktop/bulk-operations/${bulk.id}/reports`)
    expect(listResponse.status).toBe(200)
    const list = (await listResponse.json()) as {
      data: Array<{ report: { executionId: string }; items: unknown[] }>
    }
    expect(list.data.map((detail) => detail.report.executionId)).toEqual([execution.execution_id])
    expect(list.data[0]?.items).toEqual([])

    const detailResponse = await app.request(
      `/desktop/bulk-operations/${bulk.id}/reports/${execution.execution_id}`
    )
    expect(detailResponse.status).toBe(200)
    const detail = (await detailResponse.json()) as { data: { items: unknown[] } }
    expect(detail.data.items).toEqual([])
  })

  it('retourne 404 pour une opération ou un rapport inconnu', async () => {
    expect((await app.request('/desktop/bulk-operations/missing/reports')).status).toBe(404)
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
    const preview = await app.request('/desktop/bulk-operations/preview-query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ definition })
    })
    expect(preview.status).toBe(400)
    expect((await preview.json()) as unknown).toMatchObject({
      error: { code: 'not_implemented' }
    })
    const execute = await app.request(`/desktop/bulk-operations/${bulk.id}/execute`, {
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
