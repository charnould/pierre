import { describe, expect, test } from 'bun:test'

import { Hono } from 'hono'

import { verifyRepaymentMessage } from '../../../../routes/setup/messages'
import type { User } from '../../../../utils/_schema'
import { authorizeAdministrator } from '../../../../utils/authorize-role'

function app(administrator: boolean) {
  const routed = new Hono<{ Variables: { user: User } }>()
  routed.use('*', async (c, next) => {
    c.set('user', {
      email: 'alice@example.org',
      isAdministrator: administrator,
      moduleIds: ['repayment'],
      chatbotIds: []
    })
    await next()
  })
  routed.post('/verify', authorizeAdministrator, verifyRepaymentMessage)
  return routed
}

const rcs = JSON.stringify({
  group: 'RCS',
  action: 'Relancer',
  label: 'Relance',
  body: 'Bonjour.',
  choices: []
})

describe('repayment message routes', () => {
  test('verifies a message without writing and refuses a member', async () => {
    const ok = await app(true).request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: rcs })
    })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ data: { kind: 'rcs', label: 'Relance' } })

    const invalid = await app(true).request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '{ "channel": "rcs" }' })
    })
    expect(invalid.status).toBe(400)

    const refused = await app(false).request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: rcs })
    })
    expect(refused.status).toBe(403)
  })
})
