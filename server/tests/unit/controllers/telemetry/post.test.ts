import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/telemetry/post'
import { setup } from '../../../../utils/setup'

const TEST_SERVICE = '_test_telemetry_post_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

const app = new Hono()
app.post('/telemetry', controller)

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await setup()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('POST /telemetry', () => {
  it('persists host and event in the telemetry table', async () => {
    const res = await app.fetch(
      new Request('http://localhost/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'test-host',
          event: 'ai.answer.ticket.write-memo'
        })
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const sql = new Database(`${DATASTORE_ROOT}/datastore.sqlite`)
    const rows = sql.query('SELECT host, event FROM telemetry').all() as Array<{
      host: string
      event: string
    }>
    sql.close()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.host).toBe('test-host')
    expect(rows[0]?.event).toBe('ai.answer.ticket.write-memo')
  })

  it('returns 400 for invalid payload', async () => {
    const res = await app.fetch(
      new Request('http://localhost/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: '', event: 'ai.chat' })
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false })
  })
})
