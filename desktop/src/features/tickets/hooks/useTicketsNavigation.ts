import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'

type Options = {
  sheetActivityTarget?: Extract<ActivityTarget, { view: 'tickets' }> | null
  railActivityTarget?: Extract<ActivityTarget, { view: 'tickets' }> | null
  onApplySheetTarget?: (target: Extract<ActivityTarget, { view: 'tickets' }>) => void
  onApplyRailTarget?: (target: Extract<ActivityTarget, { view: 'tickets' }>) => void
}

export function useTicketsNavigation({
  sheetActivityTarget,
  railActivityTarget,
  onApplySheetTarget,
  onApplyRailTarget
}: Options) {
  useRegisterNavigationHandlers('tickets', {
    getSnapshot: () =>
      sheetActivityTarget
        ? { activityTarget: sheetActivityTarget }
        : railActivityTarget
          ? { activityTarget: railActivityTarget }
          : {},
    applySnapshot: (snapshot) => {
      const target = snapshot.activityTarget
      if (target?.view !== 'tickets') return
      onApplySheetTarget?.(target)
      onApplyRailTarget?.(target)
    }
  })
}
