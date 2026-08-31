import type { ActivitiesListResponse } from '../../src/shared/types/activites'
import type { SettingsStore } from './settings-store'

/** Same cadence as the renderer inbox poll (`useNotifications`). */
export const BADGE_POLL_INTERVAL_MS = 30_000

export type NotificationBadgePoller = {
  /** Start/stop the interval from login state (mascot `syncVisibility`). */
  setLoggedIn: (loggedIn: boolean) => void
  /** Call when the main window closes so the mascot keeps getting fresh counts. */
  onMainWindowClosed: () => void
  stop: () => void
}

type NotificationBadgePollerOptions = {
  getUrl: () => string | null
  /** True while the main renderer is alive and owns the combined badge. */
  hasMainWindow: () => boolean
  setUnreadCount: (count: number) => void
  fetchUnreadCount: (url: string) => Promise<number | null>
  intervalMs?: number
}

/**
 * Polls inbox unread count in the main process so the mascot badge stays live
 * after the main window is destroyed. While a main window exists, this no-ops —
 * the renderer still pushes mentions + product updates.
 */
export function createNotificationBadgePoller(
  opts: NotificationBadgePollerOptions
): NotificationBadgePoller {
  const intervalMs = opts.intervalMs ?? BADGE_POLL_INTERVAL_MS
  let loggedIn = false
  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight = false

  const clearTimer = () => {
    if (timer === null) return
    clearInterval(timer)
    timer = null
  }

  const tick = async () => {
    if (!loggedIn || inFlight) return
    if (opts.hasMainWindow()) return

    const url = opts.getUrl()
    if (!url) return

    inFlight = true
    try {
      const count = await opts.fetchUnreadCount(url)
      if (count === null) return
      // Window may have reappeared while the request was in flight.
      if (opts.hasMainWindow()) return
      opts.setUnreadCount(count)
    } finally {
      inFlight = false
    }
  }

  const ensureTimer = () => {
    if (!loggedIn || timer !== null) return
    timer = setInterval(() => {
      void tick()
    }, intervalMs)
  }

  return {
    setLoggedIn(next) {
      loggedIn = next
      if (!loggedIn) {
        clearTimer()
        opts.setUnreadCount(0)
        return
      }
      ensureTimer()
      if (!opts.hasMainWindow()) void tick()
    },

    onMainWindowClosed() {
      if (!loggedIn) return
      ensureTimer()
      void tick()
    },

    stop() {
      loggedIn = false
      clearTimer()
    }
  }
}

/** Inbox rows already filtered to unread when `unread_only=true`. */
export function countUnreadRows(data: ActivitiesListResponse['data']): number {
  return data.filter((row) => row.my?.lu === false).length
}

export function readSettingsUrl(store: SettingsStore | null): string | null {
  const raw = store?.readSettings()
  const url = raw && typeof raw['url'] === 'string' ? raw['url'].trim() : ''
  return url || null
}
