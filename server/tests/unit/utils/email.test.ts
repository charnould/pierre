import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { configure_mailgun, inbound_route_expression } from '../../../utils/email/configure'
import { mailgun_signature_valid } from '../../../utils/email/mailgun'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('email_mailgun')
const SECRET = 'mailgun-signing-key'
const encoder = new TextEncoder()
const originalEnv = {
  api: Bun.env['SINCH_API_KEY'],
  domain: Bun.env['SINCH_DOMAIN'],
  signing: Bun.env['SINCH_WEBHOOK_SIGNING_KEY'],
  host: Bun.env['HOST']
}

const restoreEnv = (key: string, value: string | undefined): void => {
  if (value === undefined) delete Bun.env[key]
  else Bun.env[key] = value
}

async function sign(timestamp: string, token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}${token}`))
  )
  return digest.toHex()
}

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  Bun.env['SINCH_API_KEY'] = 'key-test'
  Bun.env['SINCH_DOMAIN'] = 'dribble.football'
  Bun.env['SINCH_WEBHOOK_SIGNING_KEY'] = SECRET
  Bun.env['HOST'] = 'gx.pierre-ia.org'
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
  restoreEnv('SINCH_API_KEY', originalEnv.api)
  restoreEnv('SINCH_DOMAIN', originalEnv.domain)
  restoreEnv('SINCH_WEBHOOK_SIGNING_KEY', originalEnv.signing)
  restoreEnv('HOST', originalEnv.host)
})

describe('mailgun', () => {
  it('vérifie la signature et refuse un horodatage trop ancien', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = await sign(timestamp, 'token-1')
    expect(await mailgun_signature_valid(timestamp, 'token-1', signature)).toBe(true)
    expect(await mailgun_signature_valid(timestamp, 'token-1', 'ab'.repeat(32))).toBe(false)
    expect(await mailgun_signature_valid('1000000000', 'token-1', signature)).toBe(false)
  })

  it('cible les adresses exactes des modules', () => {
    expect(inbound_route_expression('dribble.football', ['Loyer@dribble.football'])).toBe(
      'match_recipient("^loyer@dribble\\.football$")'
    )
    expect(inbound_route_expression('dribble.football', [])).toBe(
      'match_recipient("^.*@dribble\\.football$")'
    )
  })

  it('n’appelle pas Mailgun tant que le canal est vide', async () => {
    delete Bun.env['SINCH_API_KEY']
    delete Bun.env['SINCH_DOMAIN']
    delete Bun.env['SINCH_WEBHOOK_SIGNING_KEY']
    const fetchSpy = spyOn(globalThis, 'fetch')
    try {
      await configure_mailgun()
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('enregistre le suivi, les webhooks et la route, puis ne les recrée pas', async () => {
    let open = false
    const webhooks: Record<string, { urls: string[] }> = {}
    const routes: Array<{
      id: string
      description: string
      expression: string
      actions: string[]
    }> = []
    const calls: string[] = []
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push(`${method} ${url}`)
      const raw = init?.body
      const params = new URLSearchParams(
        typeof raw === 'string' || raw instanceof URLSearchParams ? raw : ''
      )
      if (url.endsWith('/tracking') && method === 'GET') {
        return Response.json({ tracking: { open: { active: open } } })
      }
      if (url.endsWith('/tracking/open') && method === 'PUT') {
        open = params.get('active') === 'yes'
        return Response.json({ open: { active: true } })
      }
      if (url.endsWith('/webhooks') && method === 'GET') return Response.json({ webhooks })
      if (url.endsWith('/webhooks') && method === 'POST') {
        webhooks[params.get('id') ?? ''] = { urls: [params.get('url') ?? ''] }
        return Response.json({ message: 'created' })
      }
      if (url.includes('/routes?') && method === 'GET') return Response.json({ items: routes })
      if (url.endsWith('/routes') && method === 'POST') {
        routes.push({
          id: 'route-1',
          description: params.get('description') ?? '',
          expression: params.get('expression') ?? '',
          actions: params.getAll('action')
        })
        return Response.json({ route: { id: 'route-1' } })
      }
      return new Response(`unexpected ${method} ${url}`, { status: 500 })
    }) as typeof fetch)
    try {
      await configure_mailgun()
      expect(open).toBe(true)
      expect(Object.keys(webhooks).sort()).toEqual([
        'accepted',
        'delivered',
        'opened',
        'permanent_fail'
      ])
      expect(webhooks['opened']?.urls).toEqual(['https://gx.pierre-ia.org/webhook/email'])
      expect(routes[0]).toMatchObject({
        description: 'PIERRE inbound',
        expression: 'match_recipient("^.*@dribble\\.football$")',
        actions: ['forward("https://gx.pierre-ia.org/webhook/email/inbound")', 'stop()']
      })
      const writes = calls.filter((call) => !call.startsWith('GET '))
      calls.length = 0
      await configure_mailgun()
      expect(calls.filter((call) => !call.startsWith('GET '))).toEqual([])
      expect(writes).toHaveLength(6)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
