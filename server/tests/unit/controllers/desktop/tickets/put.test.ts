import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as put_desktop_tickets } from '../../../../../controllers/desktop/tickets/put'
import type { Parsed_User } from '../../../../../utils/_schema'
import { setup } from '../../../../../utils/setup'

const TEST_SERVICE = '_test_put_tickets_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

const TEST_USER: Parsed_User = {
  email: 'tester@example.com',
  role: 'administrator',
  config: ['default'],
  password_hash: 'x'
}

const app = new Hono()
app.put('/desktop/tickets', async (c, next) => {
  c.set('user', TEST_USER)
  return put_desktop_tickets(c, next)
})

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
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
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
