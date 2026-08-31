import type { CreateActivityBody } from '@/shared/types/activites'
import type { RepaymentNotificationChannel } from '@/shared/types/notification-repayment'

import {
  buildRepaymentMessageActivity,
  type RepaymentMessageOptions
} from './repayment-activity-mutations'

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

export async function sendRepaymentMessage(params: {
  url: string | undefined
  tenantId: string
  comment: string
  channel: RepaymentNotificationChannel
  destinataire: string
  options?: RepaymentMessageOptions
  createActivity: (body: CreateActivityBody) => Promise<unknown>
}): Promise<boolean> {
  const { url, tenantId, comment, channel, destinataire, options, createActivity } = params
  if (channel !== 'note') {
    if (!url || !window.api?.sendCommunication) return false
    if (!destinataire) return false
    const action = options?.action?.trim()
    const response = await window.api.sendCommunication({
      url,
      idempotencyKey: crypto.randomUUID(),
      type: options?.transport === 'mailto' ? 'mailto' : channel,
      contexte: 'repayment',
      ref: tenantId,
      destinataire,
      contenu: {
        ...(action ? { action } : {}),
        ...(options?.objet?.trim() ? { objet: options.objet.trim() } : {}),
        corps: comment.trim()
      }
    })
    return response != null
  }
  const activity = buildRepaymentMessageActivity(tenantId, comment, channel, options)
  if (!activity) return false
  const res = await createActivity(activity)
  return res != null
}
