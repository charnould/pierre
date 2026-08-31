import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { activity_payload, COMMUNICATION_TYPES, type Activite } from '@/shared/types/activites'
import {
  isNotificationDeliveryStatus,
  notificationDeliveryStatusBadgeVariant,
  notificationDeliveryStatusLabel,
  type NotificationDeliveryBadgeVariant
} from '@/shared/types/notification-delivery'
import {
  isRepaymentNotificationChannel,
  repaymentNotificationChannelLabel
} from '@/shared/types/notification-repayment'

/** Statuts d'acheminement → variantes Badge shadcn. */
const DELIVERY_BADGE_VARIANT: Record<
  NotificationDeliveryBadgeVariant,
  'secondary' | 'default' | 'destructive'
> = {
  neutral: 'secondary',
  success: 'default',
  danger: 'destructive'
}

function isCommunicationType(type: string): boolean {
  return (COMMUNICATION_TYPES as readonly string[]).includes(type)
}

export function maskCommunicationRecipient(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  if (value.includes('@')) {
    const masked = value.replace(/^(.).+(@.+)$/, '$1•••$2')
    return masked || null
  }
  return value.replace(/.(?=.{4})/g, '•')
}

function formatCommunicationStatusDate(
  row: Pick<Activite, 'date_statut' | 'date_creation'>
): string | null {
  const date = new Date(row.date_statut ?? row.date_creation)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Ligne compacte d’acheminement — card Impayés, pas un Badge. */
export function formatCommunicationDeliveryLine(row: Activite): string | null {
  if (!isCommunicationType(row.type) || !isNotificationDeliveryStatus(row.statut)) return null
  let line = notificationDeliveryStatusLabel(row.statut)
  const recipient = maskCommunicationRecipient(row.destinataire)
  if (recipient) line += ` vers ${recipient}`
  const statusDate = formatCommunicationStatusDate(row)
  if (statusDate) line += ` · état au ${statusDate}`
  const payload = activity_payload(row.type, row.contenu)
  const delivery =
    payload['delivery'] && typeof payload['delivery'] === 'object'
      ? (payload['delivery'] as Record<string, unknown>)
      : null
  const fallback =
    delivery?.['fallback'] && typeof delivery['fallback'] === 'object'
      ? (delivery['fallback'] as Record<string, unknown>)
      : null
  const fallbackMedium =
    typeof fallback?.['medium'] === 'string' && isRepaymentNotificationChannel(fallback['medium'])
      ? fallback['medium']
      : null
  if (fallbackMedium) {
    const template =
      typeof fallback?.['template_label'] === 'string' ? fallback['template_label'].trim() : ''
    line += `. Nouvelle tentative automatique par ${repaymentNotificationChannelLabel(
      fallbackMedium
    ).toLocaleLowerCase('fr-FR')}${template ? ` avec « ${template} »` : ''}`
  } else if (delivery?.['finalFailure']) {
    line += '. Aucun autre canal exploitable'
  }
  return line
}

export function CommunicationDeliveryLine({
  row,
  className
}: {
  row: Activite
  className?: string
}) {
  const line = formatCommunicationDeliveryLine(row)
  if (!line) return null
  return (
    <p className={cn('text-muted-foreground m-0 text-[0.6875rem] leading-4', className)}>{line}</p>
  )
}

interface Props {
  row: Activite
  className?: string
  /** When true, also render the channel badge (legacy lists). Drawer timelines omit it. */
  showChannel?: boolean
}

/** Delivery status badge; optional channel badge for non-drawer lists. */
export function NotificationRepaymentMeta({ row, className, showChannel = false }: Props) {
  if (!row.rattachement.startsWith('repayment:')) return null

  const channel = showChannel && isRepaymentNotificationChannel(row.type) ? row.type : null
  const delivery = isNotificationDeliveryStatus(row.statut) ? row.statut : null
  const hasChannel = channel != null
  const hasDelivery = delivery != null
  const isCommunication = isCommunicationType(row.type)
  const statusDate = isCommunication ? formatCommunicationStatusDate(row) : null
  const recipient = isCommunication ? maskCommunicationRecipient(row.destinataire) : null

  if (!hasChannel && !hasDelivery) return null

  const deliveryBadge = hasDelivery ? (
    <Badge variant={DELIVERY_BADGE_VARIANT[notificationDeliveryStatusBadgeVariant(delivery)]}>
      {notificationDeliveryStatusLabel(delivery)}
    </Badge>
  ) : null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {hasChannel ? (
        <Badge variant="secondary">{repaymentNotificationChannelLabel(channel)}</Badge>
      ) : null}
      {deliveryBadge}
      {recipient ? <span className="text-muted-foreground text-xs">vers {recipient}</span> : null}
      {statusDate ? (
        <span className="text-muted-foreground text-xs">état au {statusDate}</span>
      ) : null}
    </div>
  )
}
