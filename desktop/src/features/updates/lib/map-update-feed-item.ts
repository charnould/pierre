import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { ACTIVITY_MODULE_LABELS } from '@/features/home/home-ui'
import { isUpdateEntryUnread } from '@/features/updates/lib/updates-notification'
import type { UpdateEntry } from '@/features/updates/types'

const UPDATE_ITEM_PREFIX = 'update:'

export function updateFeedItemId(slug: string): string {
  return `${UPDATE_ITEM_PREFIX}${slug}`
}

export function isUpdateFeedItemId(id: string): string | false {
  return id.startsWith(UPDATE_ITEM_PREFIX) ? id.slice(UPDATE_ITEM_PREFIX.length) : false
}

export function slugFromUpdateFeedItemId(id: string): string {
  return id.slice(UPDATE_ITEM_PREFIX.length)
}

export function mapUpdateEntryToFeedItem(
  entry: UpdateEntry,
  readSlugs: string[] | undefined
): ActivityNotificationItem {
  const isRead = !isUpdateEntryUnread(readSlugs, entry)

  return {
    id: updateFeedItemId(entry.slug),
    type: 'updates',
    source: 'update',
    ref: entry.slug,
    sender: 'Pierre',
    body: entry.title,
    createdAt: `${entry.date}T12:00:00`,
    isRead,
    boosts: {},
    target: {
      view: 'updates',
      slug: entry.slug,
      title: entry.title,
      date: entry.date
    },
    contextLabel: ACTIVITY_MODULE_LABELS.updates,
    moduleLabel: ACTIVITY_MODULE_LABELS.updates,
    notificationId: updateFeedItemId(entry.slug)
  }
}

export function mergeActivityFeedItems(
  mentionItems: ActivityNotificationItem[],
  updateItems: ActivityNotificationItem[]
): ActivityNotificationItem[] {
  return [...mentionItems, ...updateItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
