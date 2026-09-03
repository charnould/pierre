import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { createPostVmReleaseController } from '../../../../controllers/ai/post.vm.release'

const destroyCalls: string[] = []
const KNOWN_CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'
const MISSING_CONV_ID = '0198f1a0-7b6c-7000-8000-000000000002'

const destroyVm = async (convId: string) => {
  destroyCalls.push(convId)
}

const app = new Hono()
app.post('/ai/vm/release', createPostVmReleaseController(destroyVm))

describe('POST /ai/vm/release', () => {
  it('returns 204 and calls destroyVm for a known conv_id', async () => {
    destroyCalls.length = 0

    const res = await app.fetch(
      new Request('http://localhost/ai/vm/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: KNOWN_CONV_ID })
      })
    )

    expect(res.status).toBe(204)
    expect(destroyCalls).toEqual([KNOWN_CONV_ID])
  })

  it('returns 204 for unknown conv_id (idempotent)', async () => {
    destroyCalls.length = 0

    const res = await app.fetch(
      new Request('http://localhost/ai/vm/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: MISSING_CONV_ID })
      })
    )

    expect(res.status).toBe(204)
    expect(destroyCalls).toEqual([MISSING_CONV_ID])
  })

  it('returns 400 when conv_id is missing', async () => {
    const res = await app.fetch(
      new Request('http://localhost/ai/vm/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    )

    expect(res.status).toBe(400)
  })
})
