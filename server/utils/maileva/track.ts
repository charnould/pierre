import type { CommunicationChannel } from '../../../shared/activities'
import { get_activity } from '../activities/rows'
import { next_status_timestamp } from '../communications/parsing'
import { openDatastore } from '../datastore-db'
import { update_status } from '../delivery-status'
import { mailevaTarget, readProviders } from '../providers'
import { asRecord, type MailevaAuth, MailevaError, mailevaRequest } from './http'
import { decryptMailevaSecrets } from './secrets'
import { mailevaAccount, remoteStatus } from './send'

export async function reconcileMaileva(): Promise<void> {
  const providers = readProviders()
  const target = mailevaTarget(providers.mailevaUsername)
  const secrets = providers.mailevaSecrets
    ? await decryptMailevaSecrets(providers.mailevaSecrets)
    : null
  if (!target || !secrets?.clientSecret || !secrets.password) return
  const auth: MailevaAuth = {
    target,
    clientId: providers.mailevaClientId,
    clientSecret: secrets.clientSecret,
    username: providers.mailevaUsername,
    password: secrets.password
  }
  const account = mailevaAccount(providers.mailevaClientId, providers.mailevaUsername)
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const db = openDatastore({ readonly: true })
  const rows = db
    .query<
      { activity_id: number; sending_id: string; product: string; target: string; account: string },
      [string, string, string]
    >(
      `SELECT operation.activity_id, operation.sending_id, operation.product, operation.target, operation.account
       FROM communication_provider_operations operation
       JOIN activites sent ON sent.id = operation.activity_id
       WHERE operation.step = 'submitted'
         AND operation.sending_id IS NOT NULL
         AND operation.target = ? AND operation.account = ?
         AND sent.date_creation >= ?
         AND NOT EXISTS (
           SELECT 1 FROM activites later
           WHERE later.thread_id = sent.thread_id
             AND (
               later.type = 'communication.failed'
               OR later.contenu LIKE '%"result":"delivered"%'
               OR later.contenu LIKE '%"result":"opened"%'
             )
         )
       ORDER BY operation.updated_at
       LIMIT 20`
    )
    .all(target, account, cutoff)
  db.close()
  for (const row of rows) {
    const activity = get_activity(row.activity_id)
    if (!activity?.channel) continue
    try {
      const base = productPath(row.product)
      if (!base) continue
      const sending = await mailevaRequest(auth, `${base}/sendings/${row.sending_id}`)
      const recipients = await mailevaRequest(auth, `${base}/sendings/${row.sending_id}/recipients`)
      const medium = mediumFor(activity.channel)
      if (!medium) continue
      const statut =
        mailevaResourceStatus(activity.channel, firstRecipient(recipients.body)) ??
        (remoteStatus(sending.body) === 'REJECTED' || remoteStatus(sending.body) === 'ERROR'
          ? 'failed'
          : null)
      if (!statut || statut === 'sent') continue
      update_status({
        activity_id: activity.id,
        type: medium,
        statut,
        occurred_at: next_status_timestamp(activity),
        idempotency_key: `maileva:poll:${row.sending_id}:${statut}`
      })
    } catch (error) {
      if (!(error instanceof MailevaError) || !error.retryable) {
        console.error(`[maileva.reconcile] ${row.activity_id}`)
      }
    }
  }
}

let started = false

export function startMailevaReconciliation(): void {
  if (started || Bun.env['NODE_ENV'] === 'test') return
  started = true
  const timer = setInterval(
    () => {
      void reconcileMaileva()
    },
    6 * 60 * 1000
  )
  timer.unref()
}

export function mailevaResourceStatus(channel: CommunicationChannel, body: unknown): string | null {
  const record = asRecord(body)
  if (!record) return null
  const postal =
    channel === 'postal_letter' || channel === 'postal_registered_letter_with_acknowledgement'
  if (
    postal &&
    (text(record['last_delivery_status']) === 'N10' ||
      (typeof record['undelivered_mail_date'] === 'string' && record['undelivered_mail_date']))
  ) {
    return 'returned'
  }
  const detail = text(record['delivery_status_detail'])
  if (detail === 'REFUSED') return 'refused'
  if (detail === 'NOT_CLAIMED') return 'unclaimed'
  if (detail === 'BOUNCED') return postal ? 'returned' : 'undelivered'
  const candidates = [
    text(record['delivery_status']),
    text(asRecord(record['last_main_delivery_status'])?.['category']),
    text(asRecord(record['main_delivery_status'])?.['category']),
    text(asRecord(record['status'])?.['code']),
    text(record['status'])
  ]
  for (const value of candidates) {
    if (value === 'DELIVERED' || value === 'DISTRIBUTED') {
      return channel === 'electronic_registered_delivery' ? 'opened' : 'delivered'
    }
    if (value === 'ACCEPTED' && channel === 'electronic_registered_letter') return 'delivered'
    if (value === 'REFUSED') return 'refused'
    if (value === 'NOT_CLAIMED' || value === 'EXPIRED') return 'unclaimed'
    if (value === 'UNDELIVERED' || value === 'PND') return postal ? 'returned' : 'undelivered'
    if (
      value === 'REJECTED' ||
      value === 'ERROR' ||
      value === 'BOUNCED' ||
      value === 'SENDING_REJECTED' ||
      value === 'CANCELED'
    ) {
      return 'failed'
    }
  }
  if (
    channel === 'postal_registered_letter_with_acknowledgement' &&
    typeof record['acknowledgement_of_receipt_date'] === 'string' &&
    record['acknowledgement_of_receipt_date']
  ) {
    return 'delivered'
  }
  return null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function firstRecipient(body: unknown): unknown {
  const record = asRecord(body)
  const recipients = record?.['recipients']
  return Array.isArray(recipients) ? recipients[0] : body
}

function productPath(product: string): string | null {
  if (product === 'courrier') return '/mail/v3'
  if (product === 'lrar') return '/registered_mail/v4'
  if (product === 'lre') return '/electronic-qualified-registered-mail/v1'
  if (product === 'ere') return '/secured_electronic_mail/v1'
  return null
}

function mediumFor(channel: CommunicationChannel): string | null {
  switch (channel) {
    case 'postal_letter':
      return 'courrier'
    case 'postal_registered_letter_with_acknowledgement':
      return 'lrar'
    case 'electronic_registered_delivery':
      return 'ere'
    case 'electronic_registered_letter':
      return 'lre'
    default:
      return null
  }
}
