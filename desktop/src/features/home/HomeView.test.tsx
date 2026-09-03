import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { parseActionActivity, type ActionActivity } from '@/shared/lib/activities/action-activity'
import type { ActiviteListItem } from '@/shared/types/activites'
import type { UserPrincipal } from '@/shared/types/users'

const resolvedUiSettings: {
  mascot: { shape: string; color: string }
  home?: { mine?: number }
} = { mascot: { shape: 'galet', color: '#5b8c5a' } }

mock.module('@/contexts/UiSettingsContext', () => ({
  useUiSettings: () => ({ settings: resolvedUiSettings }),
  useResolvedUiSettings: () => resolvedUiSettings
}))

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown; Element?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' &&
    typeof existingWindow?.setTimeout === 'function' &&
    typeof globals.Element === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' })
    for (const key of [
      'document',
      'window',
      'HTMLElement',
      'Element',
      'Node',
      'Event',
      'MouseEvent',
      'MutationObserver',
      'getComputedStyle',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]) {
      originalGlobals.set(key, globals[key])
    }
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    installedDom = true
  }

  const raf = (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
  const caf = (id: number) => window.clearTimeout(id)
  globalThis.requestAnimationFrame = raf
  globalThis.cancelAnimationFrame = caf
  window.requestAnimationFrame = raf
  window.cancelAnimationFrame = caf
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    })) as typeof window.matchMedia
  }
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

function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function addDaysIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function openTask(title: string, dueDate = todayIso(), id = 11): ActiviteListItem {
  return {
    id,
    date_creation: '2026-09-17T08:00:00.000Z',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'task.created',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({
      version: 2,
      task: {
        title,
        state: 'open',
        assignee: { id: 'user:alice@exemple.fr', label: 'Alice' },
        due_date: dueDate
      }
    }),
    thread_id: 'thread-1',
    revision: 1,
    my: null,
    read: false,
    reaction: null
  }
}

const user: UserPrincipal = {
  email: 'alice@exemple.fr',
  isAdministrator: false,
  moduleIds: ['tickets', 'repayment'],
  chatbotIds: ['default']
}

function followedActivity(): ActivityNotificationItem {
  const row: ActiviteListItem = {
    id: 42,
    date_creation: '2026-09-17T10:00:00.000Z',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:bob@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2, text: 'A noté un appel' }),
    thread_id: null,
    revision: null,
    my: null,
    read: true,
    reaction: null
  }
  return {
    id: 42,
    type: 'repayment',
    source: 'activity',
    ref: 'LOC-1',
    sender: 'bob@exemple.fr',
    body: 'A noté un appel',
    createdAt: row.date_creation,
    isRead: true,
    boosts: {},
    target: { view: 'repayment', tenantId: 'LOC-1' },
    contextLabel: 'LOC-1',
    moduleLabel: 'Impayés',
    notificationId: 42,
    row
  }
}

function asOpenAction(row: ActiviteListItem): ActionActivity {
  const parsed = parseActionActivity(row)
  if (!parsed) throw new Error('expected open action')
  return parsed
}

function feedStub(overrides?: Partial<ActivityFeedApi>): ActivityFeedApi {
  return {
    items: [],
    unreadCount: 0,
    markItemRead: async () => {},
    markUnread: async () => {},
    markAllRead: async () => {},
    showOwnActivity: false,
    followedActivityAuthors: [],
    showRead: false,
    setShowRead: () => {},
    loadMoreNotifications: async () => {},
    loadMoreActivities: async () => {},
    hasMoreNotifications: false,
    hasMoreActivities: false,
    setShowOwnActivity: async () => {},
    setFollowedActivityAuthors: async () => {},
    toggleBoost: async () => null,
    getBoost: () => undefined,
    createActivity: async () => null,
    rows: [],
    refresh: async () => {},
    notifications: {} as ActivityFeedApi['notifications'],
    ...overrides
  }
}

async function renderHome(options?: { mine?: ActiviteListItem[]; feed?: ActivityFeedApi }) {
  const { act, useEffect } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { HomeView } = await import('./HomeView')
  const { ActivityRailProvider, useActivityRail } =
    await import('@/features/activity/lib/ActivityRailContext')

  const rail = { tasksOpen: false, tasksTab: 'mine' }
  function Probe() {
    const { tasksOpen, tasksTab } = useActivityRail()
    useEffect(() => {
      rail.tasksOpen = tasksOpen
      rail.tasksTab = tasksTab
    })
    return null
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <ActivityRailProvider>
        <Probe />
        <HomeView
          hidden={false}
          onNavigate={() => {}}
          agentName="Pierre"
          user={user}
          feed={options?.feed ?? feedStub()}
          mine={(options?.mine ?? []).map(asOpenAction)}
          delegated={[]}
          refresh={async () => {}}
        />
      </ActivityRailProvider>
    )
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

  return {
    act,
    rail,
    async cleanup() {
      await act(async () => root.unmount())
      container.remove()
    }
  }
}

describe('HomeView', () => {
  test('shows the four rails and métier doors, not a greeting', async () => {
    const { cleanup } = await renderHome()
    try {
      expect(document.body.textContent).toContain('Mes notifications')
      expect(document.body.textContent).toContain('Mes tâches')
      expect(document.body.textContent).toContain('Tâches que j’ai assignées')
      expect(document.body.textContent).toContain('Activités')
      expect(document.body.textContent).toContain('Discuter avec Pierre')
      expect(document.body.textContent).toContain('Traiter les réclamations')
      expect(document.body.textContent).toContain('Piloter les impayés')
      expect(document.body.textContent).toContain('Tout voir')
      expect(document.querySelector('.home-tile')).toBeNull()
      expect(document.body.textContent).not.toContain('Bonjour')
      expect(document.body.textContent).not.toContain('Bon après-midi')
      expect(document.body.textContent).not.toContain('Rien de neuf')
      expect(document.querySelector('.size-28')).toBeNull()
      expect(document.querySelector('.font-serif')).toBeNull()
      const nav = document.querySelector('[aria-label="Métiers"]')
      expect(nav?.className).toContain('grid-cols-3')
      const door = nav?.querySelector('[data-door="repayment"]')
      expect(door).not.toBeNull()
      expect(door?.querySelector('.size-5')).not.toBeNull()
      expect(nav?.className).not.toContain('grid-cols-4')
      const board = nav?.parentElement
      expect(board?.className).toContain('max-w-[calc(76rem+1.5rem)]')
      const rails = nav?.nextElementSibling
      expect(rails?.parentElement).toBe(board)
      expect(rails?.className).toContain('grid-cols-4')
      expect(rails?.className).toContain('gap-2')
      expect(rails?.className).toContain('items-start')
      for (const title of [
        'Mes notifications',
        'Mes tâches',
        'Tâches que j’ai assignées',
        'Activités'
      ]) {
        const heading = [...document.querySelectorAll('h2')].find(
          (node) => node.textContent === title
        )
        const section = heading?.closest('section.rounded-md.border')
        expect(section).not.toBeNull()
        expect(section?.className).toContain('h-fit')
        expect(section?.className).toContain('self-start')
        expect(section?.textContent).toContain('Tout voir')
      }
    } finally {
      await cleanup()
    }
  })

  test('renders the drawer task row with an inert square', async () => {
    const { cleanup } = await renderHome({ mine: [openTask('Relancer le locataire')] })
    try {
      expect(document.body.textContent).toContain('Relancer le locataire')
      expect(document.body.textContent).toContain('Prochaines')
      expect(document.querySelector('button[aria-label="Action à faire"]')).toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('shows a task due after 7 days under Prochaines', async () => {
    const { cleanup } = await renderHome({
      mine: [openTask('Préparer l’AG', addDaysIso(8))]
    })
    try {
      expect(document.body.textContent).toContain('Préparer l’AG')
      expect(document.body.textContent).toContain('Prochaines')
      expect(document.body.textContent).not.toContain('Dans les 7 jours')
    } finally {
      await cleanup()
    }
  })

  test('slices Mes tâches to the home excerpt', async () => {
    resolvedUiSettings.home = { mine: 5 }
    const { cleanup } = await renderHome({
      mine: Array.from({ length: 6 }, (_, index) =>
        openTask(`Tâche ${index + 1}`, todayIso(), 200 + index)
      )
    })
    try {
      expect(document.body.textContent).toContain('Tâche 1')
      expect(document.body.textContent).toContain('Tâche 5')
      expect(document.body.textContent).not.toContain('Tâche 6')
    } finally {
      delete resolvedUiSettings.home
      await cleanup()
    }
  })

  test('Tout voir on Mes tâches opens the tasks rail on mine', async () => {
    const { act, cleanup, rail } = await renderHome()
    try {
      const heading = [...document.querySelectorAll('h2')].find(
        (node) => node.textContent === 'Mes tâches'
      )
      const button = [...(heading?.closest('section')?.querySelectorAll('button') ?? [])].find(
        (node) => node.textContent === 'Tout voir'
      )
      expect(rail.tasksOpen).toBe(false)
      await act(async () => {
        button?.click()
      })
      expect(rail.tasksOpen).toBe(true)
      expect(rail.tasksTab).toBe('mine')
    } finally {
      await cleanup()
    }
  })

  test('shows a followed collaborator activity on the Activités rail', async () => {
    const { cleanup } = await renderHome({
      feed: feedStub({
        items: [followedActivity()],
        followedActivityAuthors: ['user:bob@exemple.fr']
      })
    })
    try {
      expect(document.body.textContent).toContain('A noté un appel')
      expect(document.querySelector('.activity-motion-list')).not.toBeNull()
    } finally {
      await cleanup()
    }
  })
})
