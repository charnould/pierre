import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

mock.module('@/contexts/NavigationHistoryContext', () => ({
  useNavigationHistory: () => ({ navigate: mock(() => {}) })
}))

mock.module('@/contexts/UiSettingsContext', () => ({
  useUiSettings: () => ({
    settings: { mascot: { shape: 'galet', color: '#5b8c5a' } }
  }),
  useResolvedUiSettings: () => ({
    mascot: { shape: 'galet', color: '#5b8c5a' }
  })
}))

mock.module('@/features/repayment/lib/outbound-email-templates.bundle', () => ({
  listOutboundTemplateGroups: () => [],
  listOutboundTemplates: () => [],
  resolveOutboundEmail: () => null,
  resolveOutboundRcs: () => null
}))

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  if (typeof globalThis.document !== 'undefined') return
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  dom.window.scrollTo = () => {}
  const globals = globalThis as Record<string, unknown>
  const win = dom.window as unknown as Record<string, unknown>
  for (const key of [
    'document',
    'window',
    'HTMLElement',
    'Element',
    'Node',
    'Event',
    'MouseEvent',
    'MutationObserver',
    'IntersectionObserver',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame'
  ]) {
    originalGlobals.set(key, globals[key])
    if (key === 'document') globals[key] = dom.window.document
    else if (key === 'getComputedStyle') {
      globals[key] = dom.window.getComputedStyle.bind(dom.window)
    } else if (key === 'requestAnimationFrame') {
      globals[key] = (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
    } else if (key === 'cancelAnimationFrame') {
      globals[key] = (id: number) => window.clearTimeout(id)
    } else globals[key] = win[key]
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
      root = null
      rootMargin = ''
      scrollMargin = ''
      thresholds = []
    } as unknown as typeof IntersectionObserver
  }
  installedDom = true
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

const createdAt = '2026-08-21T10:00:00'

function activityRow(
  id: number,
  overrides: {
    rattachement?: string
    auteur?: string
    type?: string
    contenu?: string
    date_creation?: string
  } = {}
) {
  return {
    id,
    date_creation: overrides.date_creation ?? '2026-08-21T09:00:00',
    rattachement: overrides.rattachement ?? 'tickets:REC-1',
    auteur: overrides.auteur ?? 'user:alice@example.test',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: overrides.type ?? 'ticket_change',
    statut: 'logged' as const,
    mentions: [],
    contenu: overrides.contenu ?? JSON.stringify({ avant: 'ouvert', apres: 'clos' }),
    my: null
  }
}

const items = [
  {
    id: 1,
    type: 'tickets' as const,
    source: 'mention' as const,
    ref: 'REC-1',
    sender: 'bob@example.test',
    body: 'Message reçu',
    createdAt,
    isRead: false,
    boosts: {},
    target: { view: 'tickets' as const, id_reclamation: 'REC-1', activityId: 1 },
    contextLabel: 'Réclamation #REC-1',
    moduleLabel: 'Réclamations',
    notificationId: 1
  },
  {
    id: 2,
    type: 'tickets' as const,
    source: 'activity' as const,
    ref: 'REC-1',
    sender: 'alice@example.test',
    body: 'Alice a mis à jour le ticket',
    createdAt: '2026-08-21T09:00:00',
    isRead: true,
    boosts: {},
    target: { view: 'tickets' as const, id_reclamation: 'REC-1', activityId: 2 },
    contextLabel: 'Réclamation #REC-1',
    moduleLabel: 'Réclamations',
    notificationId: 2,
    row: activityRow(2)
  },
  {
    id: 3,
    type: 'tickets' as const,
    source: 'activity' as const,
    ref: 'REC-2',
    sender: 'bob@example.test',
    body: 'Bob a ajouté une note',
    createdAt: '2026-08-21T08:00:00',
    isRead: true,
    boosts: {},
    target: { view: 'tickets' as const, id_reclamation: 'REC-2', activityId: 3 },
    contextLabel: 'Réclamation #REC-2',
    moduleLabel: 'Réclamations',
    notificationId: 3,
    row: activityRow(3, {
      rattachement: 'tickets:REC-2',
      auteur: 'user:bob@example.test',
      type: 'note',
      contenu: 'Bob a ajouté une note',
      date_creation: '2026-08-21T08:00:00'
    })
  },
  {
    id: 4,
    type: 'tickets' as const,
    source: 'mention' as const,
    ref: 'REC-3',
    sender: 'bob@example.test',
    body: 'Ancien message',
    createdAt: '2026-08-20T18:00:00',
    isRead: true,
    boosts: {},
    target: { view: 'tickets' as const, id_reclamation: 'REC-3', activityId: 4 },
    contextLabel: 'Réclamation #REC-3',
    moduleLabel: 'Réclamations',
    notificationId: 4
  }
]

function orgUser(login: string, email: string, displayName: string) {
  return {
    login,
    email,
    role: 'user',
    config: [],
    hasAvatar: false,
    avatarBytes: 0,
    displayName
  }
}

async function renderPanel(feed: Record<string, unknown>) {
  const { act, useEffect, useState } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { ActivityPanel } = await import('./ActivityPanel')
  const { ActivityRailProvider, useActivityRail } =
    await import('@/features/activity/lib/ActivityRailContext')

  window.api = {
    getActivities: () => new Promise(() => {}),
    getTickets: () => new Promise(() => {}),
    getUsers: async () => ({
      users: [
        orgUser('alice', 'alice@example.test', 'Alice'),
        orgUser('bob', 'bob@example.test', 'Bob')
      ]
    })
  } as unknown as typeof window.api

  function OpenPanel() {
    const { setOpen } = useActivityRail()
    useEffect(() => setOpen(true), [setOpen])
    return null
  }

  function PanelWithReadToggle() {
    const [showRead, setShowRead] = useState(Boolean(feed.showRead))
    return (
      <ActivityPanel
        feed={
          {
            loadMoreNotifications: async () => {},
            loadMoreActivities: async () => {},
            hasMoreNotifications: false,
            hasMoreActivities: false,
            ...feed,
            showRead: feed.showRead ?? showRead,
            setShowRead: feed.setShowRead ?? setShowRead
          } as never
        }
        url="https://activity.test"
        userLogin="alice@example.test"
      />
    )
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <ActivityRailProvider>
        <OpenPanel />
        <PanelWithReadToggle />
      </ActivityRailProvider>
    )
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  })

  return {
    act,
    async cleanup() {
      await act(async () => root.unmount())
      container.remove()
    }
  }
}

describe('ActivityPanel', () => {
  test('shows unread inbox, Inspector chrome, and a followable activity list', async () => {
    const markItemRead = mock(async () => {})
    const markUnread = mock(async () => {})
    const markAllRead = mock(async () => {})
    const setShowOwnActivity = mock(async () => {})
    const setFollowedActivityAuthors = mock(async () => {})
    const { act, cleanup } = await renderPanel({
      items,
      unreadCount: 1,
      markItemRead,
      markUnread,
      markAllRead,
      showOwnActivity: true,
      followedActivityAuthors: [],
      setShowOwnActivity,
      setFollowedActivityAuthors
    })

    try {
      expect([...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual([
        'Notifications',
        'Activités'
      ])
      expect(document.querySelector('[data-active-tab]')?.getAttribute('data-active-tab')).toBe(
        'notifications'
      )
      expect(document.body.textContent).toContain('Message reçu')
      expect(document.body.textContent).not.toContain('Ancien message')
      expect(document.body.textContent).not.toContain('a mis à jour le ticket')
      expect(document.body.textContent).not.toContain('Bob a ajouté une note')
      expect(document.body.textContent).toContain('Tout lu')
      const showAll = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === 'Afficher les lues et non-lues'
      )
      const markAllReadButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === 'Tout lu'
      )
      expect(showAll).not.toBeNull()
      expect(showAll?.className).toContain('border-border')
      expect(markAllReadButton?.className).toContain('border-border')
      expect(document.querySelector('[data-slot="drawer-header"]')?.textContent).not.toContain(
        'Afficher les lues et non-lues'
      )
      expect(document.querySelector('[data-slot="drawer-header"]')?.textContent).not.toContain(
        'Tout lu'
      )

      await act(async () => {
        showAll?.click()
      })
      expect(document.body.textContent).toContain('Ancien message')
      expect(document.body.textContent).toContain('Afficher uniquement les non-lues')
      expect(document.body.textContent).not.toContain('Afficher les lues et non-lues')
      expect(document.body.textContent).not.toContain('Inclure mes actions')
      expect(document.body.textContent).not.toContain('Mon activité')

      const sheet = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]')
      expect(sheet?.className).toContain('rounded-md')
      expect(sheet?.className).toContain('[--drawer-inset:0.75rem]')
      expect(sheet?.className).toContain('[--drawer-content-width:24rem]')
      expect(sheet?.className).toContain('top-[var(--titlebar-height)]')
      expect(sheet?.className).not.toContain('90dvh')
      expect(document.querySelector('[data-slot="drawer-overlay"]')?.className).toContain(
        'top-[var(--titlebar-height)]'
      )
      expect(document.querySelector('[data-slot="drawer-header"]')?.textContent).toContain(
        'Notifications'
      )
      expect(document.querySelector('[data-slot="drawer-swipe-handle"]')).toBeNull()
      expect(document.querySelector('[id^="activity-notifications-date-"]')).toBeNull()
      expect(document.querySelector('[id^="activity-notifications-folder-"]')).toBeNull()
      expect(
        [...document.querySelectorAll('h2, h3')].some((node) =>
          /Aujourd|Hier|août/i.test(node.textContent ?? '')
        )
      ).toBe(false)

      const rows = [...document.querySelectorAll<HTMLElement>('li[role="button"]')]
      const notificationRow = rows.find((row) => row.textContent?.includes('Message reçu'))
      const readRow = rows.find((row) => row.textContent?.includes('Ancien message'))
      expect(notificationRow).not.toBeNull()
      expect(readRow).not.toBeNull()
      expect(rows.indexOf(notificationRow!)).toBeLessThan(rows.indexOf(readRow!))
      expect(notificationRow?.textContent).toContain('Réclamations · #REC-1')
      expect(readRow?.textContent).toContain('Réclamations · #REC-3')
      expect(notificationRow?.textContent).toContain('Non lue')
      expect(readRow?.textContent).toContain('Lue')
      expect(readRow?.querySelector('[data-read-veil]')).not.toBeNull()

      await act(async () => {
        notificationRow?.click()
      })
      expect(markItemRead).toHaveBeenCalledWith(1)
      const drawers = [...document.querySelectorAll<HTMLElement>('[data-slot="drawer-popup"]')]
      expect(drawers).toHaveLength(2)
      expect(drawers[0]?.dataset.swipeDirection).toBe('left')
      expect(drawers[1]?.dataset.swipeDirection).toBe('right')
      expect(drawers[0]?.contains(drawers[1] ?? null)).toBe(false)
      expect(drawers[1]?.classList.contains('inspector-drawer-motion')).toBe(true)
      expect(drawers[1]?.classList.contains('shadow-md')).toBe(true)

      const activitiesTab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (tab) => tab.textContent === 'Activités'
      )
      await act(async () => activitiesTab?.click())
      expect(document.querySelector('[data-active-tab]')?.getAttribute('data-active-tab')).toBe(
        'activities'
      )
      expect(document.querySelector('[data-slot="timeline"]')).not.toBeNull()
      expect(document.querySelector('[data-slot="timeline-separator"]')).not.toBeNull()
      expect(document.querySelector('[id^="activity-activities-date-"]')).toBeNull()
      expect(document.querySelector('[id^="activity-activities-folder-"]')).toBeNull()
      expect(document.body.textContent).toContain('a mis à jour le ticket')
      expect(document.body.textContent).toContain('Réclamations · REC-1')
      expect(document.body.textContent).not.toContain('Message reçu')
      expect(document.body.textContent).not.toContain('Ancien message')
      expect(document.body.textContent).not.toContain('Bob a ajouté une note')
      expect(document.body.textContent).not.toContain('{"avant"')
      const activityRowEl = document.querySelector<HTMLElement>(
        '[data-slot="timeline-item"][role="button"]'
      )
      expect(activityRowEl).not.toBeNull()
      expect(activityRowEl?.className).not.toContain('hover:bg-muted')
      await act(async () => {
        activityRowEl?.click()
      })
      expect([...document.querySelectorAll<HTMLElement>('[data-slot="drawer-popup"]')].length).toBe(
        2
      )
      expect(document.body.textContent).not.toContain('Tout lu')
      expect(document.body.textContent).not.toContain('Afficher uniquement les non-lues')
      expect(document.body.textContent).not.toContain('Afficher les lues et non-lues')
      expect(document.body.textContent).toContain('Suivre des collaborateurs · 1')
      expect(document.querySelector('[data-slot="drawer-header"]')?.textContent).not.toContain(
        'Suivre'
      )

      const followButton = document.querySelector<HTMLButtonElement>(
        '[data-slot="popover-trigger"]'
      )
      await act(async () => {
        followButton?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 20))
      })
      const followAlice = document.querySelector<HTMLElement>('[aria-label="Suivre Alice"]')
      const followBob = document.querySelector<HTMLElement>('[aria-label="Suivre Bob"]')
      expect(followAlice).not.toBeNull()
      expect(followBob).not.toBeNull()
      await act(async () => followAlice?.click())
      expect(setShowOwnActivity).toHaveBeenCalledWith(false)
      await act(async () => followBob?.click())
      expect(setFollowedActivityAuthors).toHaveBeenCalledWith(['user:bob@example.test'])
    } finally {
      await cleanup()
    }
  })

  test('asks who to follow before showing an activity list', async () => {
    const setShowOwnActivity = mock(async () => {})
    const setFollowedActivityAuthors = mock(async () => {})
    const { act, cleanup } = await renderPanel({
      items,
      unreadCount: 1,
      markItemRead: mock(async () => {}),
      markUnread: mock(async () => {}),
      markAllRead: mock(async () => {}),
      showOwnActivity: false,
      followedActivityAuthors: [],
      setShowOwnActivity,
      setFollowedActivityAuthors
    })

    try {
      const activitiesTab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (tab) => tab.textContent === 'Activités'
      )
      await act(async () => activitiesTab?.click())
      expect(document.body.textContent).toContain('Qui suivre')
      expect(document.body.textContent).not.toContain('a mis à jour le ticket')
      expect(document.body.textContent).not.toContain('Bob a ajouté une note')
      expect(document.querySelector('[data-slot="popover-trigger"]')).toBeNull()

      await act(async () => {
        document.querySelector<HTMLElement>('[aria-label="Suivre Bob"]')?.click()
      })
      expect(setFollowedActivityAuthors).toHaveBeenCalledWith(['user:bob@example.test'])
    } finally {
      await cleanup()
    }
  })

  test('loads more notifications when the list sentinel intersects', async () => {
    let observerCallback: IntersectionObserverCallback | undefined
    const OriginalObserver = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
      root = null
      rootMargin = ''
      thresholds = []
    } as unknown as typeof IntersectionObserver

    const loadMoreNotifications = mock(async () => {})
    const { act, cleanup } = await renderPanel({
      items,
      unreadCount: 1,
      markItemRead: mock(async () => {}),
      markUnread: mock(async () => {}),
      markAllRead: mock(async () => {}),
      showOwnActivity: true,
      followedActivityAuthors: [],
      setShowOwnActivity: mock(async () => {}),
      setFollowedActivityAuthors: mock(async () => {}),
      loadMoreNotifications,
      hasMoreNotifications: true
    })

    try {
      expect(document.querySelector('[data-activity-list-sentinel]')).not.toBeNull()
      await act(async () => {
        observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {
          disconnect() {},
          observe() {},
          unobserve() {},
          takeRecords() {
            return []
          },
          root: null,
          rootMargin: '',
          scrollMargin: '',
          thresholds: []
        })
      })
      expect(loadMoreNotifications).toHaveBeenCalled()
    } finally {
      globalThis.IntersectionObserver = OriginalObserver
      await cleanup()
    }
  })
})
