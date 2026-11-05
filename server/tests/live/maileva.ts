/**
 * Dépôt sandbox d’un courrier simple et d’un LRAR.
 *
 * PIERRE_LIVE_MAILEVA=1 bun server/tests/live/maileva.ts
 *
 * Variables dans .env :
 * - MAILEVA_CLIENT_ID, MAILEVA_CLIENT_SECRET, MAILEVA_USERNAME, MAILEVA_PASSWORD
 * - MAILEVA_SENDER_ADDRESS, MAILEVA_TEST_ADDRESS : nom, voie, puis code postal et ville
 *
 * Un dépôt accepté n’est pas distribué.
 */
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { create_outbound } from '../../utils/communications/storage'
import { MAILEVA_PRODUCTS, type MailevaProduct } from '../../utils/maileva/endpoints'
import { type MailevaAuth, MailevaError, mailevaRequest } from '../../utils/maileva/http'
import { encryptMailevaSecrets } from '../../utils/maileva/secrets'
import { dispatchMaileva, remoteStatus } from '../../utils/maileva/send'
import { setDatastoreRoot } from '../../utils/paths'
import { emptyProviders, mailevaTarget, writeProviders } from '../../utils/providers'
import { setup } from '../../utils/setup'

const REQUIRED = [
  'MAILEVA_CLIENT_ID',
  'MAILEVA_CLIENT_SECRET',
  'MAILEVA_USERNAME',
  'MAILEVA_PASSWORD',
  'MAILEVA_SENDER_ADDRESS',
  'MAILEVA_TEST_ADDRESS'
] as const

const PRODUCTS = ['courrier', 'lrar'] as const satisfies readonly MailevaProduct[]
const PDF = join(import.meta.dir, '../unit/utils/__mocks__/input-2-pages.pdf')

if (Bun.env['PIERRE_LIVE_MAILEVA'] !== '1') {
  console.log('PIERRE_LIVE_MAILEVA=1 requis. Aucun envoi.')
  process.exit(0)
}

const env = Object.fromEntries(REQUIRED.map((key) => [key, Bun.env[key]?.trim() ?? '']))
const missing = REQUIRED.filter((key) => !env[key])
if (missing.length > 0) throw new Error(`Variables manquantes : ${missing.join(', ')}`)
if (!env['MAILEVA_USERNAME']!.toLowerCase().startsWith('sandbox.')) {
  throw new Error('MAILEVA_USERNAME doit commencer par sandbox.')
}
const target = mailevaTarget(env['MAILEVA_USERNAME']!)
if (!target) throw new Error('MAILEVA_USERNAME doit commencer par sandbox.')
const auth: MailevaAuth = {
  target,
  clientId: env['MAILEVA_CLIENT_ID']!,
  clientSecret: env['MAILEVA_CLIENT_SECRET']!,
  username: env['MAILEVA_USERNAME']!,
  password: env['MAILEVA_PASSWORD']!
}

const sender = postalLines(env['MAILEVA_SENDER_ADDRESS']!, 'MAILEVA_SENDER_ADDRESS')
const recipient = postalLines(env['MAILEVA_TEST_ADDRESS']!, 'MAILEVA_TEST_ADDRESS')
const bytes = await Bun.file(PDF).bytes()
const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

Bun.env['AUTH_SECRET'] = 'pierre-maileva-live-test-secret-32'
const root = join(tmpdir(), `pierre-maileva-${crypto.randomUUID()}`)
setDatastoreRoot(root)
let failed = false
try {
  await setup()
  writeProviders({
    ...emptyProviders(),
    mailevaClientId: env['MAILEVA_CLIENT_ID']!,
    mailevaUsername: env['MAILEVA_USERNAME']!,
    mailevaAddress: sender.join('\n'),
    mailevaSecrets: await encryptMailevaSecrets({
      clientSecret: env['MAILEVA_CLIENT_SECRET']!,
      password: env['MAILEVA_PASSWORD']!,
      totpSecret: ''
    })
  })
  for (const product of PRODUCTS) {
    try {
      const activity = create_outbound({
        actor: 'live@pierre-ia.org',
        contexte: 'tickets',
        ref: crypto.randomUUID(),
        type: product,
        destinataire: recipient.filter(Boolean).join(', '),
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
        delivery: { kind: 'postal', lines: recipient, country: 'FR' }
      })
      console.log(`${product} ${sendingId}`)
      const detail = await mailevaRequest(
        auth,
        `${MAILEVA_PRODUCTS[product]}/sendings/${sendingId}`
      )
      console.log(`${product} ${remoteStatus(detail.body) || 'sans statut'}`)
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
