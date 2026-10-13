/**
 * Opt-in. Envoie de vrais messages CM.com.
 * PIERRE_LIVE_CM=1 bun server/tests/live/cm-channels.ts
 *
 * La réponse email arrive ensuite sur /webhook/email/inbound (Mailgun).
 */
const enabled = process.env['PIERRE_LIVE_CM'] === '1'
if (!enabled) {
  console.log('PIERRE_LIVE_CM=1 requis. Aucun message envoyé.')
  process.exit(0)
}

const host = process.env['HOST']
const password = process.env['AUTH_PASSWORD']
if (!host || !password) throw new Error('HOST et AUTH_PASSWORD requis')

const origin = `https://${host}`
const ref = `E2E-CM-${crypto.randomUUID()}`
const rattachement = `tickets:${ref}`

const login = await fetch(`${origin}/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@pierre-ia.org', password })
})
if (!login.ok) throw new Error(`Connexion refusée (${login.status})`)
const cookie = login.headers.get('set-cookie') ?? ''

const send = async (path: string, body: unknown) => {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
      'idempotency-key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`${path} ${response.status} ${JSON.stringify(payload)}`)
  return payload as { data: { id: number; thread_id: string; rattachement: string } }
}

const rcs = await send('/rcs', {
  contexte: 'tickets',
  ref,
  destinataire: '0621804969',
  contenu: {
    body: 'Test Pierre. Choisissez une réponse.',
    sms_fallback: 'Test Pierre. Réponse SMS.',
    choices: [{ type: 'reply', label: 'Bien reçu' }]
  }
})
console.log(`RCS envoyé ${rattachement} thread ${rcs.data.thread_id}. Répondez avec le bouton.`)
console.log(
  'Pour le SMS : désactivez le RCS du téléphone ou utilisez un numéro incompatible, puis relancez un envoi. Sans échec réel de CM.com, le repli n’est pas exercé.'
)

const email = await send('/email', {
  contexte: 'tickets',
  ref,
  destinataire: 'charnould@icloud.com',
  contenu: { subject: 'Test Pierre', body: 'Email transactionnel de vérification.' }
})
console.log(
  `Email envoyé, fil ${email.data.thread_id}, distinct du RCS : ${email.data.thread_id !== rcs.data.thread_id}`
)
console.log('Réponse email : Mailgun la poste sur /webhook/email/inbound.')
console.log(`Nettoyage manuel : activités dont le rattachement est ${rattachement}.`)
