/** Canaux des notifications `type: repayment` — desktop + serveur. */

const REPAYMENT_NOTIFICATION_CHANNELS = [
  'note',
  'rcs',
  'sms',
  'email',
  'courrier',
  'lrar',
  'lre',
  'signature'
] as const

export type RepaymentNotificationChannel = (typeof REPAYMENT_NOTIFICATION_CHANNELS)[number]

export function isRepaymentNotificationChannel(
  value: string | null | undefined
): value is RepaymentNotificationChannel {
  return value != null && (REPAYMENT_NOTIFICATION_CHANNELS as readonly string[]).includes(value)
}

const CHANNEL_LABELS: Record<RepaymentNotificationChannel, string> = {
  note: 'Note',
  rcs: 'RCS',
  sms: 'SMS',
  email: 'Courriel',
  courrier: 'Courrier',
  lrar: 'Lettre recommandée',
  lre: 'Lettre recommandée électronique',
  signature: 'Signature électronique'
}

export function repaymentNotificationChannelLabel(channel: RepaymentNotificationChannel): string {
  return CHANNEL_LABELS[channel]
}
