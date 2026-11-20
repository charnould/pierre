import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import type { IntakeSubmittedContent } from '@/shared/types/activities'

export type ReaderTarget =
  | { kind: 'update'; slug: string; title: string; date: string }
  | {
      kind: 'automation'
      activityId: number | string
      automationId: string
      title?: string
      content?: string
      date?: string
    }
  | {
      kind: 'intake'
      intakeId: string
      title: string
      date: string
      content: IntakeSubmittedContent
    }

export function readerTargetFromNotification(item: ActivityNotificationItem): ReaderTarget | null {
  if (item.type === 'intake' && item.ref) {
    return {
      kind: 'intake',
      intakeId: item.ref,
      title: item.intakeContent?.title ?? 'Collecte',
      date: item.createdAt,
      content: item.intakeContent ?? {
        version: 1,
        title: item.body || 'Collecte',
        note: item.body || undefined
      }
    }
  }
  if (item.target?.view === 'updates') {
    return {
      kind: 'update',
      slug: item.target.slug,
      title: item.target.title,
      date: item.target.date
    }
  }
  return null
}
