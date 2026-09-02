/** Statut de livraison d'un message outbound (SMS / courriel). */

const NOTIFICATION_DELIVERY_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'read',
  'received',
  'failed',
  'undelivered',
  'rejected',
  'bounced',
  'returned',
  'signed',
  'refused',
  'unclaimed',
  'expired'
] as const

export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number]

export function isNotificationDeliveryStatus(
  value: string | null | undefined
): value is NotificationDeliveryStatus {
  return value != null && (NOTIFICATION_DELIVERY_STATUSES as readonly string[]).includes(value)
}

const STATUS_LABELS: Record<NotificationDeliveryStatus, string> = {
  queued: 'En file d’attente',
  sent: 'Envoyé',
  delivered: 'Délivré',
  read: 'Lu',
  received: 'Reçu',
  failed: 'Échec',
  undelivered: 'Non délivré',
  rejected: 'Rejeté',
  bounced: 'Rebond',
  returned: 'Retourné',
  signed: 'Signé',
  refused: 'Refusé',
  unclaimed: 'Non réclamé',
  expired: 'Expiré'
}

export function notificationDeliveryStatusLabel(status: NotificationDeliveryStatus): string {
  return STATUS_LABELS[status]
}

export type NotificationDeliveryBadgeVariant = 'neutral' | 'success' | 'danger'

export function notificationDeliveryStatusBadgeVariant(
  status: NotificationDeliveryStatus
): NotificationDeliveryBadgeVariant {
  if (
    status === 'delivered' ||
    status === 'read' ||
    status === 'sent' ||
    status === 'received' ||
    status === 'signed'
  ) {
    return 'success'
  }
  if (
    status === 'failed' ||
    status === 'undelivered' ||
    status === 'rejected' ||
    status === 'bounced' ||
    status === 'returned' ||
    status === 'refused' ||
    status === 'unclaimed' ||
    status === 'expired'
  ) {
    return 'danger'
  }
  return 'neutral'
}
