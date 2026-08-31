import { formatActivityBoostBody } from '@/features/activity/lib/activity-boost-copy'
import { extractReportTitle } from '@/features/automations/lib/extract-report-title'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'
import type { ActiviteListItem, ActivityType, Mention } from '@/shared/types/activites'
import { activity_payload, activity_texte, is_boost_notification } from '@/shared/types/activites'

type ActivityModule = 'tickets' | 'repayment' | 'automations' | 'bulk' | 'updates'

type ActivityFeedSource = 'mention' | 'activity' | 'update'

export type ActivityNotificationItem = {
  id: number | string
  type: ActivityModule
  source: ActivityFeedSource
  ref: string
  sender: string
  body: string
  /** L2 for authored rows; omit or empty when the headline is enough. */
  detail?: string
  /** Raw activity for Inspector-identical timeline rows. */
  row?: ActiviteListItem
  createdAt: string
  isRead: boolean
  boosts: Record<string, string>
  target: ActivityTarget | null
  contextLabel: string
  moduleLabel: string
  notificationId: number | string
  /** Markdown report body for automation reader (when available). */
  readerContent?: string
  /** Emoji d’un activity_boost — absent si ce n’est pas un boost ou si l’emoji est vide. */
  boostEmoji?: string
}

export function mentionsToBoosts(mentions: Mention[]): Record<string, string> {
  const boosts: Record<string, string> = {}
  for (const mention of mentions) {
    if (mention.boost) boosts[mention.destinataire] = mention.boost
  }
  return boosts
}

const splitRattachement = (rattachement: string): { type: ActivityModule; ref: string } | null => {
  const separator = rattachement.indexOf(':')
  if (separator <= 0) return null
  const type = rattachement.slice(0, separator)
  const ref = rattachement.slice(separator + 1)
  if (!['tickets', 'repayment', 'automations', 'bulk'].includes(type) || !ref) return null
  return { type: type as ActivityModule, ref }
}

function sourceActivityId(row: ActiviteListItem): number {
  if (!is_boost_notification(row.type)) return row.id
  const payload = activity_payload(row.type, row.contenu)
  const sourceId = Number(payload['activite_source_id'])
  return Number.isInteger(sourceId) && sourceId > 0 ? sourceId : row.id
}

export function activityToTarget(row: ActiviteListItem): ActivityTarget | null {
  const parsed = splitRattachement(row.rattachement)
  if (!parsed) return null
  const activityId = sourceActivityId(row)
  if (parsed.type === 'tickets') {
    return { view: 'tickets', id_reclamation: parsed.ref, activityId }
  }
  if (parsed.type === 'repayment') {
    return {
      view: 'repayment',
      tenantId: parsed.ref,
      idClient: row.id_client,
      activityId
    }
  }
  if (parsed.type === 'bulk') return null
  return { view: 'automations', automationId: parsed.ref, activityId }
}

export function mapActivityRow(
  row: ActiviteListItem,
  contextLabel: string,
  moduleLabel: string
): ActivityNotificationItem {
  const parsed = splitRattachement(row.rattachement)
  const target = activityToTarget(row)

  const payload = activity_payload(row.type, row.contenu)
  const contenu = activity_texte(row.type, row.contenu)
  const boostEmoji = typeof payload['emoji'] === 'string' ? payload['emoji'].trim() : ''
  const sourceType =
    typeof payload['type_activite_source'] === 'string'
      ? (payload['type_activite_source'] as ActivityType)
      : row.type
  const body = is_boost_notification(row.type)
    ? formatActivityBoostBody(sourceType, boostEmoji)
    : parsed?.type === 'automations' && typeof payload['titre'] === 'string'
      ? payload['titre']
      : parsed?.type === 'automations' && contenu
        ? extractReportTitle(contenu, row.type)
        : contenu || row.type

  return {
    id: row.id,
    type: parsed?.type ?? 'tickets',
    source: 'mention',
    ref: parsed?.ref ?? row.rattachement,
    sender: row.auteur.includes(':') ? row.auteur.slice(row.auteur.indexOf(':') + 1) : row.auteur,
    body,
    createdAt: row.date_creation,
    isRead: row.my?.lu === true,
    boosts: mentionsToBoosts(row.mentions),
    target,
    contextLabel,
    moduleLabel,
    notificationId: row.id,
    readerContent: parsed?.type === 'automations' && contenu ? contenu : undefined,
    boostEmoji: is_boost_notification(row.type) && boostEmoji ? boostEmoji : undefined
  }
}

export function loginFromEmail(email: string): string {
  const at = email.indexOf('@')
  return (at === -1 ? email : email.slice(0, at)).trim().toLowerCase()
}
