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
