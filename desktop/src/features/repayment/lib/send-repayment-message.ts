import type { Activite, CreateActivityBody } from '@/shared/types/activites'
import type { RepaymentNotificationChannel } from '@/shared/types/notification-repayment'

import type { RcsContenu } from '../../../../../shared/rcs-message'
import { buildRepaymentMessageActivity } from './repayment-activity-mutations'

export type RepaymentMessageResult =
  | { ok: true }
  | { ok: false; message?: string; activity?: Activite }

export function repaymentFallbackDestinataire(
  tenant: Record<string, unknown>,
  channel: RepaymentNotificationChannel
): string {
  const fallback =
    channel === 'email'
      ? tenant['email_client']
      : channel === 'rcs'
        ? tenant['telephone_client']
        : tenant['adresse']
  return typeof fallback === 'string' ? fallback.trim() : ''
}

export async function sendRepaymentRcs(params: {
  url: string | undefined
  tenantId: string
  destinataire: string
  contenu: RcsContenu
}): Promise<RepaymentMessageResult> {
  const destinataire = params.destinataire.trim()
  if (!params.url || !destinataire) return { ok: false }
  const response = await window.api?.sendCommunication?.({
    url: params.url,
    idempotencyKey: crypto.randomUUID(),
    contexte: 'repayment',
    ref: params.tenantId,
    destinataire,
    channel: 'rcs',
    contenu: params.contenu
  })
  if (!response) return { ok: false }
  if ('error' in response) {
    return { ok: false, message: response.error.message, activity: response.data }
  }
  return { ok: true }
}

export async function recordRepaymentEmail(params: {
  url: string | undefined
  tenantId: string
  destinataire: string
  subject?: string
  body: string
  action?: string
}): Promise<RepaymentMessageResult> {
  const destinataire = params.destinataire.trim()
  if (!params.url || !destinataire) return { ok: false }
  const action = params.action?.trim()
  const subject = params.subject?.trim()
  const response = await window.api?.recordExternalCommunication?.({
    url: params.url,
    idempotencyKey: crypto.randomUUID(),
    contexte: 'repayment',
    ref: params.tenantId,
    destinataire,
    channel: 'email',
    contenu: {
      ...(action ? { action } : {}),
      ...(subject ? { subject } : {}),
      body: params.body.trim()
    }
  })
  return response != null ? { ok: true } : { ok: false }
}

export async function sendRepaymentNote(params: {
  tenantId: string
  comment: string
  createActivity: (body: CreateActivityBody) => Promise<unknown>
}): Promise<RepaymentMessageResult> {
  const activity = buildRepaymentMessageActivity(params.tenantId, params.comment, 'note')
  if (!activity) return { ok: false }
  const response = await params.createActivity(activity)
  return response != null ? { ok: true } : { ok: false }
}
