import type { ActivityBoostEmoji } from '@/features/activity/lib/activity-boosts'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import type { Activite, ActivityPatch, Mention } from '@/shared/types/activites'
import { is_boost_notification, mention_of } from '@/shared/types/activites'

export function activityActorDestinataire(userLogin: string): string {
  const raw = userLogin.trim().toLowerCase()
  if (!raw) return ''
  return raw.includes(':') ? raw : `user:${raw}`
}

export function canBoostActivity(
  activity: Pick<Activite, 'auteur' | 'type'>,
  currentUser: string
): boolean {
  if (is_boost_notification(activity.type)) return false
  const author = parseActivityAuthor(activity.auteur)
  if (author.kind !== 'user') return false
  const me = activityActorDestinataire(currentUser)
  return Boolean(me) && activity.auteur.trim().toLowerCase() !== me
}

export function currentActivityBoost(mentions: Mention[], currentUser: string): string | undefined {
  const me = activityActorDestinataire(currentUser)
  if (!me) return undefined
  return mention_of(mentions, me)?.boost ?? undefined
}

export function activityBoostPatch(emoji: ActivityBoostEmoji | null): ActivityPatch {
  return { operation: 'set_boost', emoji }
}
