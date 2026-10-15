/**
 * Test live CM.com.
 *
 * PIERRE_LIVE_CM=1 bun server/tests/live/cm-channels.ts
 *
 * Variables requises :
 * - HOST
 * - AUTH_PASSWORD
 * - CM_TEST_EMAIL
 * - CM_TEST_PHONE
 * - CM_RCS_WEBHOOK_SECRET : secret du webhook mobile
 *
 * Le contact doit être `rcs_compatible` sur le serveur ciblé avant le test.
 */
import { normalize_telephone } from '../../utils/contacts'

const enabled = process.env['PIERRE_LIVE_CM'] === '1'
if (!enabled) {
  console.log('PIERRE_LIVE_CM=1 requis. Aucun message envoyé.')
  process.exit(0)
}

const host = process.env['HOST']
const password = process.env['AUTH_PASSWORD']
const emailAddress = process.env['CM_TEST_EMAIL']
const rawPhone = process.env['CM_TEST_PHONE']
const webhookSecret = process.env['CM_RCS_WEBHOOK_SECRET']
const loginEmail = process.env['AUTH_EMAIL'] ?? 'admin@pierre-ia.org'
const timeoutMs = Number(process.env['CM_TEST_TIMEOUT_MS'] ?? 300_000)
if (!host || !password || !emailAddress || !rawPhone || !webhookSecret) {
  throw new Error(
    'HOST, AUTH_PASSWORD, CM_TEST_EMAIL, CM_TEST_PHONE et CM_RCS_WEBHOOK_SECRET requis'
  )
}

const phone = normalize_telephone(rawPhone)
if (phone.status === 'invalid') throw new Error('CM_TEST_PHONE doit être un numéro mobile valide')

const origin = `https://${host}`
const ref = `E2E-CM-${crypto.randomUUID()}`
const rattachement = `tickets:${ref}`

const login = await fetch(`${origin}/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: loginEmail, password })
})
if (!login.ok) throw new Error(`Connexion refusée (${login.status})`)
const cookie = login.headers.get('set-cookie') ?? ''

type SendResult = {
  data: { id: number; thread_id: string; rattachement: string; channel: string }
}

const send = async (path: string, body: unknown, idempotencyKey: string): Promise<SendResult> => {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify(body)
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`${path} ${response.status} ${JSON.stringify(payload)}`)
  return payload as SendResult
}

type Activity = {
  id: number
  type: string
  channel: string | null
  contenu: string
  thread_id: string | null
  revision: number | null
  id_externe: string | null
}

const result_of = (row: Activity): string | null => {
  try {
    const content = JSON.parse(row.contenu) as { result?: unknown }
    return typeof content.result === 'string' ? content.result : null
  } catch {
    return null
  }
}

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}

const activities = async (): Promise<Activity[]> => {
  const response = await fetch(
    `${origin}/desktop/activities?rattachement=${encodeURIComponent(rattachement)}&limit=500`,
    { headers: { cookie } }
  )
  if (!response.ok) throw new Error(`Lecture des activités refusée (${response.status})`)
  return ((await response.json()) as { data: Activity[] }).data
}

const waitFor = async (
  label: string,
  check: (rows: Activity[]) => boolean
): Promise<Activity[]> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const rows = await activities()
    if (check(rows)) {
      console.log(`OK  ${label}`)
      return rows
    }
    await Bun.sleep(2_000)
  }
  throw new Error(`Délai dépassé : ${label}`)
}

const rcsBody = {
  contexte: 'tickets',
  ref,
  destinataire: phone.value,
  contenu: {
    body: `Test RCS PIERRE ${ref}. Choisissez une réponse.`,
    sms_fallback: `Test SMS PIERRE ${ref}.`,
    choices: [{ type: 'reply', label: 'Bien reçu' }]
  }
}
const rcsKey = crypto.randomUUID()
const rcs = await send('/rcs', rcsBody, rcsKey)
assert(
  rcs.data.channel === 'rcs',
  'Le contact distant doit être réinitialisé en rcs_compatible avant le test'
)
const rcsRetry = await send('/rcs', rcsBody, rcsKey)
assert(rcsRetry.data.id === rcs.data.id, 'Le rejeu RCS doit retourner la même activité')
console.log(`RCS envoyé. Fil ${rcs.data.thread_id}. Appuyez sur « Bien reçu ».`)

const emailBody = {
  contexte: 'tickets',
  ref,
  destinataire: emailAddress,
  contenu: {
    subject: `Test PIERRE ${ref}`,
    body: `Ouvrez cet email puis répondez. Référence : ${ref}`
  }
}
const emailKey = crypto.randomUUID()
const email = await send('/email', emailBody, emailKey)
const emailRetry = await send('/email', emailBody, emailKey)
assert(emailRetry.data.id === email.data.id, 'Le rejeu email doit retourner la même activité')
console.log(`Email envoyé. Fil ${email.data.thread_id}. Ouvrez-le puis répondez.`)

assert(
  email.data.thread_id !== rcs.data.thread_id,
  'Un email indépendant et un RCS ne doivent pas partager un fil'
)

await Promise.all([
  waitFor('RCS accepté', (rows) =>
    rows.some(
      (row) =>
        row.thread_id === rcs.data.thread_id &&
        row.channel === 'rcs' &&
        row.type === 'communication.ok' &&
        result_of(row) === 'sent'
    )
  ),
  waitFor('email accepté avec un identifiant CM', (rows) =>
    rows.some(
      (row) =>
        row.thread_id === email.data.thread_id &&
        row.channel === 'email' &&
        row.type === 'communication.ok' &&
        row.id_externe != null &&
        result_of(row) === 'sent'
    )
  )
])

const fallbackBody = {
  contexte: 'tickets',
  ref,
  destinataire: phone.value,
  contenu: {
    body: `Test repli RCS PIERRE ${ref}.`,
    sms_fallback: `Test repli SMS PIERRE ${ref}.`
  }
}
const fallbackKey = crypto.randomUUID()
const fallback = await send('/rcs', fallbackBody, fallbackKey)
assert(fallback.data.channel === 'rcs', 'Le fallback doit commencer par un RCS')
const fallbackRetry = await send('/rcs', fallbackBody, fallbackKey)
assert(
  fallbackRetry.data.id === fallback.data.id,
  'Le rejeu du RCS de fallback doit retourner la même activité'
)

const fallbackEvent = JSON.stringify({
  reference: String(fallback.data.id),
  status: { code: 3 },
  received: new Date().toISOString()
})
for (let replay = 0; replay < 2; replay += 1) {
  const response = await fetch(
    `${origin}/webhook/rcs?webhook_secret=${encodeURIComponent(webhookSecret)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: fallbackEvent
    }
  )
  assert(response.ok, `Déclenchement du repli refusé (${response.status})`)
}

const fallbackRows = await waitFor('RCS échoué et SMS de repli envoyé dans le même fil', (rows) => {
  const thread = rows.filter((row) => row.thread_id === fallback.data.thread_id)
  const sms = thread.filter((row) => row.channel === 'sms' && row.type === 'communication.sent')
  return (
    thread.some((row) => row.channel === 'rcs' && row.type === 'communication.failed') &&
    sms.length === 1 &&
    thread.some(
      (row) => row.channel === 'sms' && row.type === 'communication.ok' && result_of(row) === 'sent'
    )
  )
})
assert(
  fallbackRows.filter(
    (row) =>
      row.thread_id === fallback.data.thread_id &&
      row.channel === 'sms' &&
      row.type === 'communication.sent'
  ).length === 1,
  'Le rejeu du webhook ne doit créer qu’un SMS de fallback'
)

const smsBody = {
  contexte: 'tickets',
  ref,
  destinataire: phone.value,
  contenu: { body: `Test routage SMS direct PIERRE ${ref}.` }
}
const smsKey = crypto.randomUUID()
const sms = await send('/rcs', smsBody, smsKey)
assert(sms.data.channel === 'sms', 'Le contact sms_compatible doit contourner le RCS')
const smsRetry = await send('/rcs', smsBody, smsKey)
assert(smsRetry.data.id === sms.data.id, 'Le rejeu SMS doit retourner la même activité')
await waitFor('envoi ultérieur routé directement en SMS', (rows) => {
  const thread = rows.filter((row) => row.thread_id === sms.data.thread_id)
  return (
    thread.filter((row) => row.channel === 'sms' && row.type === 'communication.sent').length ===
      1 &&
    thread.some(
      (row) => row.channel === 'sms' && row.type === 'communication.ok' && result_of(row) === 'sent'
    ) &&
    !thread.some((row) => row.channel === 'rcs')
  )
})

await Promise.all([
  waitFor('email ouvert', (rows) =>
    rows.some(
      (row) =>
        row.thread_id === email.data.thread_id &&
        row.channel === 'email' &&
        row.type === 'communication.ok' &&
        result_of(row) === 'opened'
    )
  ),
  waitFor('réponse email dans le fil email', (rows) =>
    rows.some(
      (row) =>
        row.thread_id === email.data.thread_id &&
        row.channel === 'email' &&
        row.type === 'communication.received'
    )
  ),
  waitFor('réponse RCS dans le fil RCS', (rows) =>
    rows.some(
      (row) =>
        row.thread_id === rcs.data.thread_id &&
        row.channel === 'rcs' &&
        row.type === 'communication.received'
    )
  )
])

console.log(`Test terminé. Rattachement : ${rattachement}`)
