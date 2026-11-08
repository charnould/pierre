/**
 * Essais sandbox Maileva.
 *
 * PIERRE_LIVE_MAILEVA=sender bun server/tests/live/maileva.ts
 * PIERRE_LIVE_MAILEVA=all bun server/tests/live/maileva.ts
 *
 * `sender` liste ou crée l’expéditeur et affiche son Sender ID.
 * La clé OTP arrive ensuite par e-mail : la coller dans MAILEVA_TOTP_SECRET.
 * `all` dépose un courrier, un LRAR, un ERE et une LREQ, puis lit leur statut.
 */
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { create_outbound } from '../../utils/communications/storage'
import { MAILEVA_PRODUCTS, type MailevaProduct } from '../../utils/maileva/endpoints'
import {
  asRecord,
  type MailevaAuth,
  MailevaError,
  mailevaRequest,
  resourceId
} from '../../utils/maileva/http'
import { encryptMailevaSecrets } from '../../utils/maileva/secrets'
import { dispatchMaileva, type MailevaDelivery, remoteStatus } from '../../utils/maileva/send'
import { decodeBase32 } from '../../utils/maileva/totp'
import { setDatastoreRoot } from '../../utils/paths'
import { emptyProviders, mailevaTarget, writeProviders } from '../../utils/providers'
import { setup } from '../../utils/setup'

const MODE = Bun.env['PIERRE_LIVE_MAILEVA']
const PDF = join(import.meta.dir, '../unit/utils/__mocks__/input-2-pages.pdf')
const SENDER_PATH = '/electronic_mail_emitter/v1/senders'

if (MODE !== 'sender' && MODE !== 'all') {
  console.log('PIERRE_LIVE_MAILEVA=sender ou all requis. Aucun appel.')
  process.exit(0)
}

const credentials = required([
  'MAILEVA_CLIENT_ID',
  'MAILEVA_CLIENT_SECRET',
  'MAILEVA_USERNAME',
  'MAILEVA_PASSWORD',
  'MAILEVA_SENDER_ADDRESS',
  'MAILEVA_SENDER_EMAIL'
])
if (!credentials['MAILEVA_USERNAME']!.toLowerCase().startsWith('sandbox.')) {
  throw new Error('MAILEVA_USERNAME doit commencer par sandbox.')
}
const target = mailevaTarget(credentials['MAILEVA_USERNAME']!)
if (target !== 'sandbox') throw new Error('MAILEVA_USERNAME doit commencer par sandbox.')
const auth: MailevaAuth = {
  target,
  clientId: credentials['MAILEVA_CLIENT_ID']!,
  clientSecret: credentials['MAILEVA_CLIENT_SECRET']!,
  username: credentials['MAILEVA_USERNAME']!,
  password: credentials['MAILEVA_PASSWORD']!
}
const sender = postalLines(credentials['MAILEVA_SENDER_ADDRESS']!, 'MAILEVA_SENDER_ADDRESS')
const locality = cityLine(sender[5] ?? '')

if (MODE === 'sender') {
  const senderId = await ensureSender(credentials['MAILEVA_SENDER_EMAIL']!, sender, locality)
  console.log(`Sender ID ${senderId}`)
  console.log(`La clé OTP arrive par e-mail à ${credentials['MAILEVA_SENDER_EMAIL']}.`)
  process.exit(0)
}

const deposit = required(['MAILEVA_SENDER_ID', 'MAILEVA_TOTP_SECRET', 'MAILEVA_TEST_ADDRESS'])
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    deposit['MAILEVA_SENDER_ID']!
  )
) {
  throw new Error('MAILEVA_SENDER_ID doit être un UUID')
}
try {
  const secret = decodeBase32(deposit['MAILEVA_TOTP_SECRET']!)
  if (secret.byteLength === 0) throw new Error('vide')
} catch {
  throw new Error('MAILEVA_TOTP_SECRET doit être la clé Base32 permanente')
}
const recipient = postalLines(deposit['MAILEVA_TEST_ADDRESS']!, 'MAILEVA_TEST_ADDRESS')
const bytes = await Bun.file(PDF).bytes()
const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
const products = ['courrier', 'lrar', 'ere', 'lre'] as const satisfies readonly MailevaProduct[]

Bun.env['AUTH_SECRET'] = 'pierre-maileva-live-test-secret-32'
const root = join(tmpdir(), `pierre-maileva-${crypto.randomUUID()}`)
setDatastoreRoot(root)
let failed = false
try {
  await setup()
  writeProviders({
    ...emptyProviders(),
    mailevaClientId: auth.clientId,
    mailevaUsername: auth.username,
    mailevaSenderId: deposit['MAILEVA_SENDER_ID']!,
    mailevaAddress: sender.join('\n'),
    mailevaSecrets: await encryptMailevaSecrets({
      clientSecret: auth.clientSecret,
      password: auth.password,
      totpSecret: deposit['MAILEVA_TOTP_SECRET']!
    })
  })
  for (const product of products) {
    const postal = product === 'courrier' || product === 'lrar'
    const delivery: MailevaDelivery = postal
      ? { kind: 'postal', lines: recipient, country: 'FR' }
      : {
          kind: 'electronic',
          email: credentials['MAILEVA_SENDER_EMAIL']!,
          legalStatus: 'PROFESSIONAL',
          firstName: '',
          lastName: '',
          company: 'BECKREL'
        }
    try {
      const activity = create_outbound({
        actor: 'live@pierre-ia.org',
        contexte: 'tickets',
        ref: crypto.randomUUID(),
        type: product,
        destinataire: postal
          ? recipient.filter(Boolean).join(', ')
          : credentials['MAILEVA_SENDER_EMAIL']!,
        contenu: JSON.stringify({
          version: 2,
          subject: `Essai ${product}`,
          body: 'Essai sandbox Maileva',
          provider: 'Maileva',
          document: { name: 'lettre.pdf', sha256 }
        }),
        idempotency_key: crypto.randomUUID()
      })
      const sendingId = await dispatchMaileva({
        activityId: activity.id,
        threadId: activity.threadId ?? '',
        product,
        name: `Essai ${product}`,
        message: 'Essai sandbox Maileva',
        document: { name: 'lettre.pdf', mediaType: 'application/pdf', bytes },
        delivery
      })
      const detail = await mailevaRequest(
        auth,
        `${MAILEVA_PRODUCTS[product]}/sendings/${sendingId}`
      )
      console.log(`${product} ${sendingId} ${remoteStatus(detail.body) || 'sans statut'}`)
    } catch (error) {
      failed = true
      const message =
        error instanceof MailevaError || error instanceof Error ? error.message : 'échec'
      console.error(`${product} ${message}`)
    }
  }
} finally {
  setDatastoreRoot(null)
  await rm(root, { recursive: true, force: true })
}
process.exit(failed ? 1 : 0)

async function ensureSender(
  email: string,
  lines: string[],
  place: { postal: string; city: string }
): Promise<string> {
  const listed = await mailevaRequest(auth, `${SENDER_PATH}?count=50`)
  const matches = senders(listed.body).filter((item) => item.email === email.toLowerCase())
  if (matches.length > 1) {
    throw new Error(
      `Plusieurs expéditeurs pour ${email} : ${matches.map((item) => item.id).join(', ')}`
    )
  }
  const existing = matches[0]
  if (existing) return existing.id
  const created = await mailevaRequest(auth, SENDER_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'MR',
      legal_status: 'PROFESSIONAL',
      first_name: 'Charles-Henri',
      last_name: 'Arnould',
      email,
      company_name: 'BECKREL',
      country: 'FR',
      address1: lines[3] || lines[1],
      zip_code: place.postal,
      city: place.city,
      email_validated: true
    })
  })
  const senderId = resourceId(created.body)
  if (!senderId)
    throw new MailevaError('Maileva n’a pas identifié l’expéditeur', 'invalid_response', false)
  return senderId
}

function senders(body: unknown): Array<{ id: string; email: string }> {
  const record = asRecord(body)
  const values = record?.['senders']
  if (!Array.isArray(values)) return []
  return values.flatMap((item) => {
    const sender = asRecord(item)
    const id = typeof sender?.['id'] === 'string' ? sender['id'] : ''
    const email = typeof sender?.['email'] === 'string' ? sender['email'].trim().toLowerCase() : ''
    return id && email ? [{ id, email }] : []
  })
}

function required(keys: string[]): Record<string, string> {
  const values = Object.fromEntries(keys.map((key) => [key, Bun.env[key]?.trim() ?? '']))
  const missing = keys.filter((key) => !values[key])
  if (missing.length > 0) throw new Error(`Variables manquantes : ${missing.join(', ')}`)
  return values
}

function postalLines(value: string, name: string): string[] {
  const parts = value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const last = parts.at(-1) ?? ''
  if (parts.length < 2 || !/^\d{5}\s+\S/.test(last)) {
    throw new Error(`${name} doit finir par un code postal et une ville`)
  }
  const street = parts.slice(1, -1).join(' ')
  const lines = ['', parts[0] ?? '', '', street, '', last]
  if (lines.some((line) => line.length > 38)) {
    throw new Error(`${name} : 38 caractères maximum par ligne`)
  }
  return lines
}

function cityLine(value: string): { postal: string; city: string } {
  const match = /^(\d{5})\s+(.+)$/.exec(value)
  if (!match?.[1] || !match[2])
    throw new Error('MAILEVA_SENDER_ADDRESS doit finir par un code postal et une ville')
  return { postal: match[1], city: match[2] }
}
