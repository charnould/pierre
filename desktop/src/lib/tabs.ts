import { REPAYMENT_PLAN_ENABLED } from './feature-flags'

/** Sidebar / main navigation tab ids (persisted across HMR via sessionStorage). */
export const TABS = ['chat', 'settings', 'home', 'request', 'repayment', 'about'] as const

export type Tab = (typeof TABS)[number]

const TAB_SET = new Set<string>(TABS)

/** @returns Whether `value` is a valid navigation tab id. */
export function isTab(value: string): value is Tab {
  return TAB_SET.has(value)
}

/** Maps disabled feature tabs to a safe default when restoring session storage. */
export function normalizeStoredTab(tab: Tab): Tab {
  if (tab === 'repayment' && !REPAYMENT_PLAN_ENABLED) return 'home'
  return tab
}
