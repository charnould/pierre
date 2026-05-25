import { warnRenderer } from './renderer-log'
import { isTab, migrateLegacyTabId, type Tab } from './tabs'

/** sessionStorage key for the last active tab (survives Vite HMR remounts in dev). */
export const ACTIVE_TAB_STORAGE_KEY = 'pierre:activeTab'

/**
 * Reads the persisted tab from sessionStorage.
 * @returns The stored tab, or `null` if missing or invalid.
 */
export function readStoredTab(storage: Storage = sessionStorage): Tab | null {
  try {
    const raw = storage.getItem(ACTIVE_TAB_STORAGE_KEY)
    if (!raw) return null
    const migrated = migrateLegacyTabId(raw)
    if (!isTab(migrated)) return null
    return migrated
  } catch (error) {
    warnRenderer('session-tab.readStoredTab', error)
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
  } catch (error) {
    warnRenderer('session-tab.writeStoredTab', error)
  }
}

/**
 * Tab to show after a successful auto-login on cold start.
 * Prefers a stored workflow/chat tab over forcing the home hub.
 */
export function tabAfterAutoLogin(stored: Tab | null): Tab {
  if (stored && stored !== 'settings') return stored
  return 'home'
}
