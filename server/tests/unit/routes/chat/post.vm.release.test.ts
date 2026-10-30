import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { createReleaseChatSession } from '../../../../routes/chat/release'

const destroyCalls: string[] = []
const knownConversationId = '0198f1a0-7b6c-7000-8000-000000000001'
const missingConversationId = '0198f1a0-7b6c-7000-8000-000000000002'

const destroyVm = async (conversationId: string) => {
  destroyCalls.push(conversationId)
}

const app = new Hono()
app.delete('/chat/sessions/:conversationId', createReleaseChatSession(destroyVm))

describe('DELETE /chat/sessions/:conversationId', () => {
  it('returns 204 and destroys a known session', async () => {
    destroyCalls.length = 0
    const response = await app.request(`/chat/sessions/${knownConversationId}`, {
      method: 'DELETE'
    })
    expect(response.status).toBe(204)
    expect(destroyCalls).toEqual([knownConversationId])
  })

  it('returns 204 when no session is registered', async () => {
    destroyCalls.length = 0
    const response = await app.request(`/chat/sessions/${missingConversationId}`, {
      method: 'DELETE'
    })
    expect(response.status).toBe(204)
    expect(destroyCalls).toEqual([missingConversationId])
  })

  it('returns 400 when the conversation id is not canonical', async () => {
    const response = await app.request('/chat/sessions/not-a-uuid', { method: 'DELETE' })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: expect.any(String) } })
  })
})
