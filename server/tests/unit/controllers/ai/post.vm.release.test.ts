import { afterAll, describe, expect, it, mock } from 'bun:test'

import { Hono } from 'hono'

const destroyCalls: string[] = []

mock.module('../../../../utils/vm-registry', () => ({
  destroyVm: async (convId: string) => {
    destroyCalls.push(convId)
  }
}))

const { controller } = await import('../../../../controllers/ai/post.vm.release')

const app = new Hono()
app.post('/ai/vm/release', controller)

describe('POST /ai/vm/release', () => {
  afterAll(() => {
    mock.restore()
  })

  it('returns 204 and calls destroyVm for a known conv_id', async () => {
    destroyCalls.length = 0

    const res = await app.fetch(
      new Request('http://localhost/ai/vm/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: 'conv-abc' })
      })
    )

    expect(res.status).toBe(204)
    expect(destroyCalls).toEqual(['conv-abc'])
  })

  it('returns 204 for unknown conv_id (idempotent)', async () => {
    destroyCalls.length = 0

    const res = await app.fetch(
      new Request('http://localhost/ai/vm/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: 'conv-missing' })
      })
    )

    expect(res.status).toBe(204)
    expect(destroyCalls).toEqual(['conv-missing'])
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
