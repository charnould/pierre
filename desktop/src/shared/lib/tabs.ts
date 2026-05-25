/** Sidebar / main navigation tab ids (persisted across HMR via sessionStorage). */
export const TABS = [
  'chat',
  'settings',
  'home',
  'tickets',
  'repayment',
  'insurance-attestation',
  'relocation',
  'about',
  'automations',
  'updates'
] as const

export type Tab = (typeof TABS)[number]

const TAB_SET = new Set<string>(TABS)

/** @returns Whether `value` is a valid navigation tab id. */
export function isTab(value: string): value is Tab {
  return TAB_SET.has(value)
}

/** Legacy tab id from before the tickets rename. */
export function migrateLegacyTabId(value: string): string {
  return value === 'request' ? 'tickets' : value
}
