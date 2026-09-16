import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/telemetry/post'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'

const paths = testDatastorePaths('telemetry_post')

const app = new Hono()
app.post('/telemetry', controller)

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await setup()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
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

    const sql = new Database(`${paths.root}/datastore.sqlite`)
    const rows = sql.query('SELECT recorded_at, host, event FROM telemetry').all() as Array<{
      recorded_at: string
      host: string
      event: string
    }>
    sql.close()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.host).toBe('test-host')
    expect(rows[0]?.event).toBe('ai.answer.ticket.write-memo')
    expect(rows[0]?.recorded_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
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
