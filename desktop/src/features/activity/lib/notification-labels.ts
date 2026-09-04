import {
  loginFromEmail,
  type ActivityNotificationItem
} from '@/features/activity/lib/notification-types'
import { ACTIVITY_MODULE_LABELS, type ActivityModuleView } from '@/features/home/home-ui'
import { formatMentionDisplay } from '@/shared/lib/activities/mentions'
import type { ActivityContext } from '@/shared/types/activites'

export function moduleLabelForType(type: ActivityContext): string {
  if (type === 'automations') return 'Routines'
  if (type === 'bulk') return 'Traitements de masse'
  return ACTIVITY_MODULE_LABELS[type as ActivityModuleView]
}

export function contextLabelForNotification(type: ActivityContext, ref: string): string {
  if (type === 'tickets') {
    return `Réclamation #${ref}`
  }
  if (type === 'repayment') {
    return ref
  }
  if (type === 'automations') {
    return ref
  }
  return ref
}

export function ticketContextLabel(id_reclamation: string): string {
  return contextLabelForNotification('tickets', id_reclamation)
}

export function activitySenderLabel(
  item: Pick<ActivityNotificationItem, 'type' | 'sender'>
): string {
  if (item.type === 'automations' || item.type === 'updates') return 'Pierre'
  const raw = item.sender.trim()
  if (!raw) return 'Pierre'
  return formatMentionDisplay(loginFromEmail(raw) || raw)
}

export function activityRowContextLabel(
  item: Pick<ActivityNotificationItem, 'type' | 'ref' | 'moduleLabel'>,
  routineName?: string
): string {
  const module = item.moduleLabel
  if (item.type === 'automations') {
    return routineName ? `${module} · ${routineName}` : module
  }
  if (item.type === 'updates') return module
  if (item.type === 'tickets') return `${module} · #${item.ref}`
  if (item.type === 'repayment') return `${module} · ${item.ref}`
  if (item.type === 'bulk') return `${module} · ${item.ref}`
  return module
}
