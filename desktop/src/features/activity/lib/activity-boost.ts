import type { ActivityBoostEmoji } from '@/features/activity/lib/activity-boosts'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { is_activity_meta_type, type Activite, type ActivityPatch } from '@/shared/types/activites'

export function activityActorDestinataire(userLogin: string): string {
  const raw = userLogin.trim().toLowerCase()
  if (!raw) return ''
  return raw.includes(':') ? raw : `user:${raw}`
}

export function canBoostActivity(
  activity: Pick<Activite, 'auteur' | 'type'>,
  currentUser: string
): boolean {
  if (is_activity_meta_type(activity.type)) {
    return false
  }
  const author = parseActivityAuthor(activity.auteur)
  if (author.kind !== 'user') return false
  const me = activityActorDestinataire(currentUser)
  return Boolean(me) && activity.auteur.trim().toLowerCase() !== me
}

export function currentActivityBoost(reaction: string | null | undefined): string | undefined {
  return reaction ?? undefined
}

export function activityBoostPatch(emoji: ActivityBoostEmoji | null): ActivityPatch {
  return { operation: 'set_boost', emoji }
}
