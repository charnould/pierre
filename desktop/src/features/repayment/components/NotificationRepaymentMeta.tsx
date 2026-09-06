import { maskCommunicationRecipient } from '@/shared/components/timeline/communication-delivery-line'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { COMMUNICATION_TYPES, type Activite } from '@/shared/types/activites'
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

export {
  CommunicationDeliveryLine,
  formatCommunicationDeliveryLine,
  maskCommunicationRecipient
} from '@/shared/components/timeline/communication-delivery-line'

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
