import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import {
  type ReaderTarget,
  readerTargetFromNotification
} from '@/features/activity/lib/reader-target'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'

export function openActivityNotification(
  item: ActivityNotificationItem,
  deps: {
    openReader: (target: ReaderTarget) => void
    openContextTarget: (target: ActivityTarget) => void
    markItemRead: (id: number | string) => Promise<void> | void
    closeRail?: () => void
  }
): void {
  if (item.type === 'automations' && item.target?.view === 'automations') {
    deps.closeRail?.()
    if (item.readerContent?.trim()) {
      void window.api?.openAutomationReport({ html: item.readerContent })
    }
    if (!item.isRead) void deps.markItemRead(item.id)
    return
  }

  const reader = readerTargetFromNotification(item)
  if (reader) {
    deps.openReader(reader)
    if (!item.isRead) void deps.markItemRead(item.id)
    return
  }

  if (item.target?.view !== 'tickets' && item.target?.view !== 'repayment') {
    return
  }

  deps.openContextTarget(item.target)
  if (!item.isRead) void deps.markItemRead(item.id)
}
