import type { Tab } from '@/shared/lib/tabs'

export function preloadTab(tab: Tab): void {
  switch (tab) {
    case 'chat':
      void import('@/features/chat')
      return
    case 'tickets':
      void import('@/features/tickets')
      return
    case 'repayment':
      void import('@/features/repayment')
      return
    case 'automations':
      void import('@/features/automations')
      return
    case 'bulk':
      void import('@/features/outreach/BulkOperationsView')
      return
    case 'about':
      void import('@/features/about')
      return
    default:
      return
  }
}
