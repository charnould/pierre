import { isTab, normalizeStoredTab, type Tab } from './tabs'

/** sessionStorage key for the last active tab (survives Vite HMR remounts in dev). */
export const ACTIVE_TAB_STORAGE_KEY = 'pierre:activeTab'

/**
 * Reads the persisted tab from sessionStorage.
 * @returns The stored tab, or `null` if missing or invalid.
 */
export function readStoredTab(storage: Storage = sessionStorage): Tab | null {
  try {
    const raw = storage.getItem(ACTIVE_TAB_STORAGE_KEY)
    if (!raw || !isTab(raw)) return null
    return normalizeStoredTab(raw)
  } catch {
    return null
  }
}

/**
 * Persists the active tab (no-op for `settings` — login screen is not restored after HMR).
 */
export function writeStoredTab(tab: Tab, storage: Storage = sessionStorage): void {
  try {
    if (tab === 'settings') {
      storage.removeItem(ACTIVE_TAB_STORAGE_KEY)
      return
    }
    storage.setItem(ACTIVE_TAB_STORAGE_KEY, tab)
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * Tab to show after a successful auto-login on cold start.
 * Prefers a stored workflow/chat tab over forcing the home hub.
 */
export function tabAfterAutoLogin(stored: Tab | null): Tab {
  if (stored && stored !== 'settings') return normalizeStoredTab(stored)
  return 'home'
}
