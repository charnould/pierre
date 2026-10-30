import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { emptyBulkOperationDefinition } from '../../../../../../shared/bulk-operations'
import {
  createBulkOperation as postBulk,
  deleteBulkOperation as deleteBulk,
  executeBulkOperation as executeBulk,
  getBulkOperation as getOneBulk,
  listBulkOperations as getBulk,
  patchBulkOperation as patchBulk,
  previewBulkMessage as previewMessage,
  previewBulkQuery as previewQuery
} from '../../../../../routes/bulk'
import type { User } from '../../../../../utils/_schema'
import { authorizeAdministrator } from '../../../../../utils/authorize-role'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'
import { seedInstanceSetup } from '../../../../seed-setup'

const paths = testDatastorePaths('bulk_routes')

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: c.req.header('x-test-admin') === 'true',
    moduleIds: ['bulk'],
    chatbotIds: ['default']
  })
  await next()
})
app.get('/bulk', getBulk)
app.get('/bulk/:id', getOneBulk)
app.post('/bulk', postBulk)
app.patch('/bulk/:id', patchBulk)
app.delete('/bulk/:id', deleteBulk)
app.post('/bulk/preview/query', previewQuery)
app.post('/bulk/preview/message', previewMessage)
app.post('/bulk/:id/execute', authorizeAdministrator, executeBulk)

const definition = {
  ...emptyBulkOperationDefinition(),
  delivery: {
    kind: 'fallback' as const,
    steps: [
      {
        medium: 'email' as const,
        action: 'Relancer',
        subject: 'Impayé {{id_locataire}}',
        body: 'Bonjour {{nom_locataire}}',
        placeholderBindings: {
          id_locataire: 'id_locataire',
          nom_locataire: 'nom_locataire'
        }
      }
    ] as const
  }
}

const operationBody = {
  name: 'Relance email',
  description: 'Test intégré',
  definition,
  reportsToKeep: 2
}

const request = (method: string, body?: unknown, isAdministrator = false) => ({
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(isAdministrator ? { 'x-test-admin': 'true' } : {})
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
})

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  await seedInstanceSetup()
  const db = new Database(`${paths.root}/datastore.sqlite`)
  db.run(`
    CREATE TABLE comptes_locataires (
      id_locataire TEXT,
      id_client TEXT,
      nom_locataire TEXT,
      email_client TEXT,
      montant_en_euros REAL,
      categorie TEXT
    )
  `)
  db.run(
    `INSERT INTO comptes_locataires
       (id_locataire, id_client, nom_locataire, email_client, montant_en_euros, categorie)
     VALUES ('LOC-1', 'CLI-1', 'Curie', 'marie@example.org', 120, 'loyer_principal')`
  )
  db.run(
    "INSERT INTO contacts (value, status, checked_at) VALUES ('marie@example.org', 'ok', '2030-01-01T00:00:00Z')"
  )
  db.close()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('bulk CRUD, previews and execution authorization', () => {
  it('covers the CRUD route lifecycle with persisted edit history', async () => {
    const createdResponse = await app.request('/bulk', request('POST', operationBody))
    expect(createdResponse.status).toBe(201)
    const created = (await createdResponse.json()) as { data: { id: string; edits: unknown[] } }
    expect(created.data.edits).toHaveLength(1)

    expect((await app.request('/bulk')).status).toBe(200)
    const detail = await app.request(`/bulk/${created.data.id}`)
    expect(detail.status).toBe(200)

    const patched = await app.request(
      `/bulk/${created.data.id}`,
      request('PATCH', { name: 'Relance révisée', reportsToKeep: 1 })
    )
    expect(patched.status).toBe(200)
    expect((await patched.json()) as unknown).toMatchObject({
      data: { name: 'Relance révisée', reportsToKeep: 1, edits: [{}, {}] }
    })

    const deleted = await app.request(`/bulk/${created.data.id}`, request('DELETE'))
    expect(deleted.status).toBe(200)
    expect((await app.request(`/bulk/${created.data.id}`)).status).toBe(404)
  })

  it('returns 409 when an active run definition would change', async () => {
    const created = (await (await app.request('/bulk', request('POST', operationBody))).json()) as {
      data: { id: string }
    }
    using db = new Database(paths.database)
    db.run(
      `INSERT INTO bulk_jobs (
         id, bulk_operation_id, execution_id, item_id, source, mode, report_status, payload
       ) VALUES (?, ?, ?, ?, 'comptes_locataires', 'send', 'in_progress', '{}')`,
      [Bun.randomUUIDv7(), created.data.id, Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    )

    const conflict = await app.request(
      `/bulk/${created.data.id}`,
      request('PATCH', {
        definition: { ...definition, amountRange: { from: '10' } }
      })
    )
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toMatchObject({ error: { code: 'conflict' } })

    expect(
      (
        await app.request(
          `/bulk/${created.data.id}`,
          request('PATCH', { name: 'Métadonnée autorisée' })
        )
      ).status
    ).toBe(200)
    expect(
      (await app.request(`/bulk/${created.data.id}`, request('PATCH', { definition }))).status
    ).toBe(200)
  })

  it('previews the selected population and a rendered message at the controller boundary', async () => {
    const query = await app.request('/bulk/preview/query', request('POST', { definition }))
    expect(query.status).toBe(200)
    expect((await query.json()) as unknown).toMatchObject({
      data: {
        rows: [{ id_locataire: 'LOC-1', status: 'eligible' }],
        totals: { total: 1, eligible: 1 }
      }
    })

    const message = await app.request(
      '/bulk/preview/message',
      request('POST', { definition, id_locataire: 'LOC-1' })
    )
    expect(message.status).toBe(200)
    expect((await message.json()) as unknown).toMatchObject({
      data: {
        kind: 'text',
        medium: 'email',
        subject: 'Impayé LOC-1',
        rendered: 'Bonjour Curie'
      }
    })
  })

  it('allows standard users on ordinary mutations and reserves execution for administrators', async () => {
    const created = (await (await app.request('/bulk', request('POST', operationBody))).json()) as {
      data: { id: string }
    }

    for (const [method, path, body, expectedStatus] of [
      ['POST', '/bulk', operationBody, 201],
      ['PATCH', `/bulk/${created.data.id}`, { name: 'Oui' }, 200],
      ['POST', '/bulk/preview/query', { definition }, 200],
      ['POST', '/bulk/preview/message', { definition, id_locataire: 'LOC-1' }, 200]
    ] as const) {
      const response = await app.request(path, request(method, body))
      expect(response.status).toBe(expectedStatus)
    }

    const userExecute = await app.request(
      `/bulk/${created.data.id}/execute`,
      request('POST', { mode: 'apply_without_send', clientCommandId: 'cmd-user' })
    )
    expect(userExecute.status).toBe(403)

    const adminExecute = await app.request(
      `/bulk/${created.data.id}/execute`,
      request('POST', { mode: 'apply_without_send', clientCommandId: 'cmd-admin' }, true)
    )
    expect(adminExecute.status).toBe(200)
    expect((await adminExecute.json()) as unknown).toMatchObject({
      data: { totals: { total: 1, applied: 1 } }
    })
    expect((await app.request(`/bulk/${created.data.id}`, request('DELETE'))).status).toBe(200)
  })
})
