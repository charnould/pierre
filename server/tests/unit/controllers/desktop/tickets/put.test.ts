import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as put_desktop_tickets } from '../../../../../controllers/desktop/tickets/put'
import type { User } from '../../../../../utils/_schema'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const paths = testDatastorePaths('put_tickets')

const TEST_USER: User = {
  email: 'tester@example.com',
  isAdministrator: true,
  moduleIds: ['tickets'],
  chatbotIds: ['default'],
  passwordHash: 'x'
}

const app = new Hono<{ Variables: { user: User } }>()
app.put(
  '/desktop/tickets',
  async (c, next) => {
    c.set('user', TEST_USER)
    await next()
  },
  put_desktop_tickets
)

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
  const db = new Database(paths.database)
  db.run(`
    CREATE TABLE reclamations (
      id_reclamation TEXT PRIMARY KEY,
      id_locataire TEXT NOT NULL,
      id_lot TEXT,
      message TEXT
    )
  `)
  db.close()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('PUT /desktop/tickets', () => {
  it('inserts a reclamation row', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_reclamation: 'reclamation-abc',
          id_locataire: 'locataire-xyz'
        })
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })
  })

  it('updates message on existing row', async () => {
    await app.fetch(
      new Request('http://localhost/desktop/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_reclamation: 'reclamation-abc',
          id_locataire: 'locataire-xyz'
        })
      })
    )

    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_reclamation: 'reclamation-abc',
          id_locataire: 'locataire-xyz',
          message: 'Bonjour'
        })
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })
  })

  it('rejects invalid body', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_reclamation: '',
          id_locataire: 'locataire-xyz'
        })
      })
    )

    expect(res.status).toBe(400)
  })
})
