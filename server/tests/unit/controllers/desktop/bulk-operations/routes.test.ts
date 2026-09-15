import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { emptyBulkOperationDefinition } from '../../../../../../shared/bulk-operations'
import { controller as deleteBulk } from '../../../../../controllers/desktop/bulk-operations/delete'
import { controller as getBulk } from '../../../../../controllers/desktop/bulk-operations/get'
import { controller as getOneBulk } from '../../../../../controllers/desktop/bulk-operations/get.one'
import { controller as patchBulk } from '../../../../../controllers/desktop/bulk-operations/patch'
import { controller as postBulk } from '../../../../../controllers/desktop/bulk-operations/post'
import { controller as executeBulk } from '../../../../../controllers/desktop/bulk-operations/post.execute'
import { controller as previewMessage } from '../../../../../controllers/desktop/bulk-operations/post.preview-message'
import { controller as previewQuery } from '../../../../../controllers/desktop/bulk-operations/post.preview-query'
import type { User } from '../../../../../utils/_schema'
import { authorizeAdministrator } from '../../../../../utils/authorize-role'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const paths = testDatastorePaths('bulk_routes')

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: c.req.header('x-test-admin') === 'true',
    moduleIds: ['bulk'],
    chatbotIds: ['default'],
    passwordHash: 'unused'
  })
  await next()
})
app.get('/desktop/bulk-operations', getBulk)
app.get('/desktop/bulk-operations/:id', getOneBulk)
app.post('/desktop/bulk-operations', postBulk)
app.patch('/desktop/bulk-operations/:id', patchBulk)
app.delete('/desktop/bulk-operations/:id', deleteBulk)
app.post('/desktop/bulk-operations/preview-query', previewQuery)
app.post('/desktop/bulk-operations/preview-message', previewMessage)
app.post('/desktop/bulk-operations/:id/execute', authorizeAdministrator, executeBulk)

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
    const createdResponse = await app.request(
      '/desktop/bulk-operations',
      request('POST', operationBody)
    )
    expect(createdResponse.status).toBe(201)
    const created = (await createdResponse.json()) as { data: { id: string; edits: unknown[] } }
    expect(created.data.edits).toHaveLength(1)

    expect((await app.request('/desktop/bulk-operations')).status).toBe(200)
    const detail = await app.request(`/desktop/bulk-operations/${created.data.id}`)
    expect(detail.status).toBe(200)

    const patched = await app.request(
      `/desktop/bulk-operations/${created.data.id}`,
      request('PATCH', { name: 'Relance révisée', reportsToKeep: 1 })
    )
    expect(patched.status).toBe(200)
    expect((await patched.json()) as unknown).toMatchObject({
      data: { name: 'Relance révisée', reportsToKeep: 1, edits: [{}, {}] }
    })

    const deleted = await app.request(
      `/desktop/bulk-operations/${created.data.id}`,
      request('DELETE')
    )
    expect(deleted.status).toBe(200)
    expect((await app.request(`/desktop/bulk-operations/${created.data.id}`)).status).toBe(404)
  })

  it('previews the selected population and a rendered message at the controller boundary', async () => {
    const query = await app.request(
      '/desktop/bulk-operations/preview-query',
      request('POST', { definition })
    )
    expect(query.status).toBe(200)
    expect((await query.json()) as unknown).toMatchObject({
      data: {
        rows: [{ id_locataire: 'LOC-1', status: 'eligible' }],
        totals: { total: 1, eligible: 1 }
      }
    })

    const message = await app.request(
      '/desktop/bulk-operations/preview-message',
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
    const created = (await (
      await app.request('/desktop/bulk-operations', request('POST', operationBody))
    ).json()) as { data: { id: string } }

    for (const [method, path, body, expectedStatus] of [
      ['POST', '/desktop/bulk-operations', operationBody, 201],
      ['PATCH', `/desktop/bulk-operations/${created.data.id}`, { name: 'Oui' }, 200],
      ['POST', '/desktop/bulk-operations/preview-query', { definition }, 200],
      [
        'POST',
        '/desktop/bulk-operations/preview-message',
        { definition, id_locataire: 'LOC-1' },
        200
      ]
    ] as const) {
      const response = await app.request(path, request(method, body))
      expect(response.status).toBe(expectedStatus)
    }

    const userExecute = await app.request(
      `/desktop/bulk-operations/${created.data.id}/execute`,
      request('POST', { mode: 'apply_without_send', clientCommandId: 'cmd-user' })
    )
    expect(userExecute.status).toBe(403)

    const adminExecute = await app.request(
      `/desktop/bulk-operations/${created.data.id}/execute`,
      request('POST', { mode: 'apply_without_send', clientCommandId: 'cmd-admin' }, true)
    )
    expect(adminExecute.status).toBe(200)
    expect((await adminExecute.json()) as unknown).toMatchObject({
      data: { totals: { total: 1, applied: 1 } }
    })
    expect(
      (await app.request(`/desktop/bulk-operations/${created.data.id}`, request('DELETE'))).status
    ).toBe(200)
  })
})

it('keeps every desktop bulk endpoint registered in the server app', async () => {
  const appSource = await Bun.file(new URL('../../../../../app.ts', import.meta.url)).text()
  for (const route of [
    '/desktop/bulk-operations/preview-query',
    '/desktop/bulk-operations/preview-message',
    '/desktop/bulk-operations/:id/reports/:executionId',
    '/desktop/bulk-operations/:id/reports',
    '/desktop/bulk-operations/:id/execute',
    '/desktop/bulk-operations/:id',
    '/desktop/bulk-operations'
  ]) {
    expect(appSource).toContain(`'${route}'`)
  }
})
