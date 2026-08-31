import { describe, expect, it } from 'bun:test'

import {
  BADGE_POLL_INTERVAL_MS,
  countUnreadRows,
  createNotificationBadgePoller
} from './notification-badge-poller'

describe('countUnreadRows', () => {
  it('counts only rows with my.lu === false', () => {
    expect(
      countUnreadRows([
        { my: { destinataire: 'user:alice@pierre.test', lu: false, boost: null } },
        { my: { destinataire: 'user:alice@pierre.test', lu: true, boost: null } },
        { my: null }
      ] as Parameters<typeof countUnreadRows>[0])
    ).toBe(1)
  })
})

describe('createNotificationBadgePoller', () => {
  it('exports the same interval as the renderer poll', () => {
    expect(BADGE_POLL_INTERVAL_MS).toBe(30_000)
  })

  it('clears the badge on logout and ignores closed-window ticks', async () => {
    const counts: number[] = []
    let fetchCalls = 0

    const poller = createNotificationBadgePoller({
      getUrl: () => 'https://pierre.test',
      hasMainWindow: () => false,
      setUnreadCount: (count) => counts.push(count),
      fetchUnreadCount: async () => {
        fetchCalls += 1
        return 2
      },
      intervalMs: 60_000
    })

    poller.setLoggedIn(true)
    await Promise.resolve()
    expect(fetchCalls).toBe(1)
    expect(counts).toEqual([2])

    poller.setLoggedIn(false)
    expect(counts.at(-1)).toBe(0)

    const before = fetchCalls
    poller.onMainWindowClosed()
    await Promise.resolve()
    expect(fetchCalls).toBe(before)

    poller.stop()
  })

  it('skips fetch while the main window owns the badge', async () => {
    let fetchCalls = 0
    const counts: number[] = []

    const poller = createNotificationBadgePoller({
      getUrl: () => 'https://pierre.test',
      hasMainWindow: () => true,
      setUnreadCount: (count) => counts.push(count),
      fetchUnreadCount: async () => {
        fetchCalls += 1
        return 3
      },
      intervalMs: 60_000
    })

    poller.setLoggedIn(true)
    await Promise.resolve()
    expect(fetchCalls).toBe(0)
    expect(counts).toEqual([])

    poller.onMainWindowClosed()
    // hasMainWindow still true — ownership stays with the renderer
    await Promise.resolve()
    expect(fetchCalls).toBe(0)

    poller.stop()
  })

  it('fetches when the main window closes while logged in', async () => {
    let hasMain = true
    let fetchCalls = 0
    const counts: number[] = []

    const poller = createNotificationBadgePoller({
      getUrl: () => 'https://pierre.test',
      hasMainWindow: () => hasMain,
      setUnreadCount: (count) => counts.push(count),
      fetchUnreadCount: async () => {
        fetchCalls += 1
        return 4
      },
      intervalMs: 60_000
    })

    poller.setLoggedIn(true)
    await Promise.resolve()
    expect(fetchCalls).toBe(0)

    hasMain = false
    poller.onMainWindowClosed()
    await Promise.resolve()
    expect(fetchCalls).toBe(1)
    expect(counts).toEqual([4])

    poller.stop()
  })

  it('does not apply a stale count if the main window reappears mid-flight', async () => {
    let hasMain = false
    const counts: number[] = []
    let release!: (count: number) => void

    const poller = createNotificationBadgePoller({
      getUrl: () => 'https://pierre.test',
      hasMainWindow: () => hasMain,
      setUnreadCount: (count) => counts.push(count),
      fetchUnreadCount: () =>
        new Promise((resolve) => {
          release = (count) => resolve(count)
        }),
      intervalMs: 60_000
    })

    poller.setLoggedIn(true)
    await Promise.resolve()
    hasMain = true
    release(7)
    await Promise.resolve()
    expect(counts).toEqual([])

    poller.stop()
  })
})
