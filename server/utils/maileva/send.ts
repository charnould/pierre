import { activityTimestamp } from '../../../shared/activities'
import { openDatastore } from '../datastore-db'
import { mailevaLines, mailevaTarget, readProviders } from '../providers'
import { MAILEVA_PRODUCTS, type MailevaProduct } from './endpoints'
import {
  asRecord,
  errorCode,
  findUuid,
  type MailevaAuth,
  MailevaError,
  mailevaRequest,
  resourceId,
  singleflight
} from './http'
import { decryptMailevaSecrets } from './secrets'
import { totpCode } from './totp'

export type MailevaDelivery =
  | { kind: 'postal'; lines: string[]; country: string }
  | {
      kind: 'electronic'
      email: string
      legalStatus: 'PROFESSIONAL' | 'INDIVIDUAL'
      firstName: string
      lastName: string
      company: string
    }

export type MailevaDispatch = {
  activityId: number
  threadId: string
  product: MailevaProduct
  name: string
  message: string
  document: { name: string; mediaType: string; bytes: Uint8Array }
  delivery: MailevaDelivery
}

type Operation = {
  activity_id: number
  target: 'sandbox' | 'production'
  account: string
  product: MailevaProduct
  sending_id: string | null
  document_id: string | null
  recipient_id: string | null
  step: 'created' | 'documented' | 'addressed' | 'submitted'
}

const lreSessions = new Map<string, number>()

export function clear_maileva_sender_sessions_for_tests(): void {
  lreSessions.clear()
}

export function mailevaAccount(clientId: string, username: string): string {
  return new Bun.CryptoHasher('sha256')
    .update(`${clientId}\n${username}`)
    .digest('hex')
    .slice(0, 16)
}

export function unsubmittedMailevaOperations(): number {
  const db = openDatastore()
  try {
    return (
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) AS n FROM communication_provider_operations WHERE step != 'submitted'`
        )
        .get()?.n ?? 0
    )
  } finally {
    db.close()
  }
}

export async function dispatchMaileva(input: MailevaDispatch): Promise<string> {
  return singleflight(`maileva:${input.activityId}`, () => deliver(input))
}

async function deliver(input: MailevaDispatch): Promise<string> {
  const providers = readProviders()
  const secrets = providers.mailevaSecrets
    ? await decryptMailevaSecrets(providers.mailevaSecrets)
    : null
  const target = mailevaTarget(providers.mailevaUsername)
  const lines = mailevaLines(providers.mailevaAddress)
  const account = mailevaAccount(providers.mailevaClientId, providers.mailevaUsername)
  if (!target || !secrets?.clientSecret || !secrets.password || !providers.mailevaClientId) {
    throw new MailevaError('Maileva n’est pas configuré', 'not_configured', false)
  }
  if (input.delivery.kind === 'postal' && (!(lines[0] || lines[1]) || !lines[5])) {
    throw new MailevaError('L’adresse expéditeur Maileva est incomplète', 'not_configured', false)
  }
  if (
    input.delivery.kind === 'electronic' &&
    (!providers.mailevaSenderId || (input.product === 'lre' && !secrets.totpSecret))
  ) {
    throw new MailevaError(
      'L’expéditeur électronique Maileva est incomplet',
      'not_configured',
      false
    )
  }
  const auth: MailevaAuth = {
    target,
    clientId: providers.mailevaClientId,
    clientSecret: secrets.clientSecret,
    username: providers.mailevaUsername,
    password: secrets.password
  }
  const existing = operation(input.activityId)
  if (
    existing &&
    (existing.target !== target ||
      existing.account !== account ||
      existing.product !== input.product)
  ) {
    throw new MailevaError('La configuration Maileva a changé pendant cet envoi', 'rejected', false)
  }
  if (input.product === 'lre') {
    await ensureLreSession(auth, providers.mailevaSenderId, secrets.totpSecret)
  }

  let current = existing ?? {
    activity_id: input.activityId,
    target,
    account,
    product: input.product,
    sending_id: null,
    document_id: null,
    recipient_id: null,
    step: 'created' as const
  }
  if (!current.sending_id) {
    current = {
      ...current,
      sending_id: await createSending(auth, input, lines, providers.mailevaSenderId),
      step: 'created'
    }
    store(current)
  }
  if (!current.sending_id) {
    throw new MailevaError('Maileva n’a pas identifié l’envoi', 'invalid_response', true)
  }
  const sendingId = current.sending_id
  if (!current.document_id) {
    current = {
      ...current,
      document_id: await addDocument(auth, input, sendingId),
      step: 'documented'
    }
    store(current)
  }
  if (!current.recipient_id) {
    current = {
      ...current,
      recipient_id: await addRecipient(auth, input, sendingId),
      step: 'addressed'
    }
    store(current)
  }
  if (current.step !== 'submitted') {
    await submitSending(auth, input.product, sendingId)
    store({ ...current, step: 'submitted' })
  }
  return sendingId
}

async function ensureLreSession(
  auth: MailevaAuth,
  senderId: string,
  totpSecret: string
): Promise<void> {
  const key = `${auth.target}:${auth.username}:${senderId}`
  if ((lreSessions.get(key) ?? 0) > Date.now() + 60_000) return
  await singleflight(`lre:${key}`, async () => {
    const code = await totpCode(totpSecret, Date.now())
    const result = await mailevaRequest(
      auth,
      `/electronic_mail_emitter/v1/senders/${encodeURIComponent(senderId)}/authenticate_by_otp?otp_code=${encodeURIComponent(code)}`,
      { method: 'POST' }
    )
    lreSessions.set(key, expiration(result.body))
  })
}

async function createSending(
  auth: MailevaAuth,
  input: MailevaDispatch,
  sender: string[],
  senderId: string
): Promise<string> {
  const postal = input.delivery.kind === 'postal'
  const body = postal
    ? {
        name: input.name,
        custom_id: input.threadId,
        custom_data: String(input.activityId),
        color_printing: false,
        duplex_printing: true,
        print_sender_address: true,
        postage_type: 'FAST',
        ...(input.product === 'lrar' ? { acknowledgement_of_receipt: true } : {}),
        ...addressFields('sender_address_line_', sender),
        sender_country_code: 'FR'
      }
    : {
        name: input.name,
        custom_id: input.threadId,
        custom_data: String(input.activityId),
        sender_id: senderId,
        message: input.message.slice(0, 450),
        notification_language: 'FR'
      }
  const created = await mailevaRequest(auth, `${MAILEVA_PRODUCTS[input.product]}/sendings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  const createdByUs = Boolean(resourceId(created.body))
  let id = resourceId(created.body)
  if (!id && errorCode(created.body) === 'DUPLICATE_SENDING_DETECTED') {
    id = findUuid(JSON.stringify(created.body))
  }
  if (!id) throw new MailevaError('Maileva n’a pas identifié l’envoi', 'invalid_response', true)
  const detail = await mailevaRequest(auth, `${MAILEVA_PRODUCTS[input.product]}/sendings/${id}`)
  const customId = asRecord(detail.body)?.['custom_id']
  if ((!createdByUs || customId) && customId !== input.threadId) {
    throw new MailevaError('Le brouillon Maileva ne correspond pas à cet envoi', 'rejected', false)
  }
  return id
}

async function addDocument(
  auth: MailevaAuth,
  input: MailevaDispatch,
  sendingId: string
): Promise<string> {
  const form = new FormData()
  const copy = new ArrayBuffer(input.document.bytes.byteLength)
  new Uint8Array(copy).set(input.document.bytes)
  form.append('document', new File([copy], input.document.name, { type: input.document.mediaType }))
  if (input.product === 'lre') {
    form.append('name', input.document.name)
    form.append('priority', '1')
    form.append('type', 'MAIN_DOCUMENT')
  } else {
    form.append(
      'metadata',
      new Blob(
        [
          JSON.stringify(
            input.product === 'ere'
              ? { name: input.document.name }
              : input.product === 'courrier'
                ? { priority: 1, name: input.document.name, shrink: true }
                : { priority: 1, name: input.document.name }
          )
        ],
        { type: 'application/json' }
      )
    )
  }
  const created = await mailevaRequest(
    auth,
    `${MAILEVA_PRODUCTS[input.product]}/sendings/${sendingId}/documents`,
    { method: 'POST', body: form }
  )
  const id = resourceId(created.body)
  if (!id)
    throw new MailevaError('Maileva n’a pas identifié le document', 'invalid_response', false)
  return id
}

async function addRecipient(
  auth: MailevaAuth,
  input: MailevaDispatch,
  sendingId: string
): Promise<string> {
  const delivery = input.delivery
  const body =
    delivery.kind === 'postal'
      ? {
          custom_id: input.threadId,
          country_code: delivery.country.toUpperCase(),
          ...addressFields('address_line_', delivery.lines)
        }
      : {
          custom_id: input.threadId,
          email: delivery.email,
          legal_status: delivery.legalStatus,
          ...(delivery.firstName ? { first_name: delivery.firstName } : {}),
          ...(delivery.lastName ? { last_name: delivery.lastName } : {}),
          ...(delivery.company ? { company: delivery.company } : {})
        }
  const created = await mailevaRequest(
    auth,
    `${MAILEVA_PRODUCTS[input.product]}/sendings/${sendingId}/recipients`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
  const id = resourceId(created.body)
  if (!id) {
    throw new MailevaError('Maileva n’a pas identifié le destinataire', 'invalid_response', false)
  }
  return id
}

async function submitSending(
  auth: MailevaAuth,
  product: MailevaProduct,
  sendingId: string
): Promise<void> {
  const detail = await mailevaRequest(auth, `${MAILEVA_PRODUCTS[product]}/sendings/${sendingId}`)
  if (remoteStatus(detail.body) !== 'DRAFT' && remoteStatus(detail.body) !== '') return
  try {
    await mailevaRequest(auth, `${MAILEVA_PRODUCTS[product]}/sendings/${sendingId}/submit`, {
      method: 'POST'
    })
  } catch (error) {
    if (!(error instanceof MailevaError) || error.retryable) throw error
    const again = await mailevaRequest(auth, `${MAILEVA_PRODUCTS[product]}/sendings/${sendingId}`)
    if (remoteStatus(again.body) === 'DRAFT' || remoteStatus(again.body) === '') throw error
  }
}

function addressFields(prefix: string, lines: string[]): Record<string, string> {
  return Object.fromEntries(
    lines
      .slice(0, 6)
      .flatMap((line, index) => (line ? [[`${prefix}${index + 1}`, line.slice(0, 38)]] : []))
  )
}

export function remoteStatus(body: unknown): string {
  const record = asRecord(body)
  const status = record?.['status']
  if (typeof status === 'string') return status.toUpperCase()
  const code = asRecord(status)?.['code']
  return typeof code === 'string' ? code.toUpperCase() : ''
}

function expiration(body: unknown): number {
  const record = asRecord(body)
  const nested = asRecord(record?.['result'])
  const raw = record?.['expiration_date'] ?? nested?.['expiration_date']
  const parsed = typeof raw === 'string' ? Date.parse(raw) : Number.NaN
  return Number.isNaN(parsed) ? Date.now() + 50 * 60 * 1000 : parsed
}

function operation(activityId: number): Operation | null {
  const db = openDatastore()
  try {
    return (
      db
        .query<Operation, [number]>(
          `SELECT activity_id, target, account, product, sending_id, document_id, recipient_id, step
           FROM communication_provider_operations WHERE activity_id = ?`
        )
        .get(activityId) ?? null
    )
  } finally {
    db.close()
  }
}

function store(operation: Operation): void {
  const db = openDatastore()
  try {
    db.run(
      `INSERT INTO communication_provider_operations
         (activity_id, target, account, product, sending_id, document_id, recipient_id, step, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(activity_id) DO UPDATE SET
         target = excluded.target,
         account = excluded.account,
         product = excluded.product,
         sending_id = excluded.sending_id,
         document_id = excluded.document_id,
         recipient_id = excluded.recipient_id,
         step = excluded.step,
         updated_at = excluded.updated_at`,
      [
        operation.activity_id,
        operation.target,
        operation.account,
        operation.product,
        operation.sending_id,
        operation.document_id,
        operation.recipient_id,
        operation.step,
        activityTimestamp()
      ]
    )
  } finally {
    db.close()
  }
}
