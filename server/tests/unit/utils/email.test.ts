import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { cm_signature_valid } from '../../../utils/email/cm'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { emptyProviders, writeProviders } from '../../../utils/providers'

const SECRET = 'email-webhook-secret'
const encoder = new TextEncoder()
const paths = testDatastorePaths('email_signature')

const sign = async (id: string, timestamp: string, body: Uint8Array): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const prefix = encoder.encode(`${id}.${timestamp}.`)
  const data = new Uint8Array(prefix.length + body.length)
  data.set(prefix)
  data.set(body, prefix.length)
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data)).toBase64()
}

beforeAll(() => {
  setDatastoreRoot(paths.root)
  writeProviders({ ...emptyProviders(), emailSecret: SECRET })
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('signature email CM.com', () => {
  it('accepte le corps brut et refuse un horodatage trop ancien', async () => {
    const body = encoder.encode('{"type":"sent"}')
    const timestamp = String(Date.now())
    const signature = await sign('evt-1', timestamp, body)
    expect(await cm_signature_valid('evt-1', timestamp, signature, body)).toBe(true)
    expect(await cm_signature_valid('evt-1', timestamp, signature, encoder.encode('{}'))).toBe(
      false
    )
    expect(await cm_signature_valid('evt-1', '1000000000000', signature, body)).toBe(false)
  })
})
