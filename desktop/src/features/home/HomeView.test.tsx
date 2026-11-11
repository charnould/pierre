import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import { type ActionActivity, parseActionActivity } from '@/shared/lib/activities/action-activity'
import type { ActivityListItem } from '@/shared/types/activites'
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

function openTask(title: string, dueDate = todayIso(), id = 11): ActivityListItem {
  return {
    id,
    createdAt: '2026-09-17T08:00:00.000Z',
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
    threadId: 'thread-1',
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
  chatbotIds: ['default'],
  preferredName: null
}

function followedActivity(): ActivityNotificationItem {
  const row: ActivityListItem = {
    id: 42,
    createdAt: '2026-09-17T10:00:00.000Z',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:bob@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2, text: 'A noté un appel' }),
    threadId: null,
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
    createdAt: row.createdAt,
    isRead: true,
    boosts: {},
    target: { view: 'repayment', tenantId: 'LOC-1' },
    contextLabel: 'LOC-1',
    moduleLabel: 'Impayés',
    notificationId: 42,
    row
  }
}

function asOpenAction(row: ActivityListItem): ActionActivity {
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

async function renderHome(options?: {
  mine?: ActivityListItem[]
  feed?: ActivityFeedApi
  user?: UserPrincipal
  onNavigate?: (tab: string) => void
}) {
  const { act, useEffect } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { HomeView } = await import('./HomeView')
  const { ActivityRailProvider, useActivityRail } =
    await import('@/features/activity/lib/ActivityRailContext')

  const rail: {
    tasksOpen: boolean
    tasksTab: string
    readerTarget: ReaderTarget | null
  } = { tasksOpen: false, tasksTab: 'mine', readerTarget: null }
  function Probe() {
    const { tasksOpen, tasksTab, readerTarget } = useActivityRail()
    useEffect(() => {
      rail.tasksOpen = tasksOpen
      rail.tasksTab = tasksTab
      rail.readerTarget = readerTarget
    }, [readerTarget, tasksOpen, tasksTab])
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
          onNavigate={options?.onNavigate ?? (() => {})}
          agentName="Pierre"
          user={options?.user ?? user}
          feed={options?.feed ?? feedStub()}
          mine={(options?.mine ?? []).map(asOpenAction)}
          delegated={[]}
          refresh={async () => {}}
        />
      </ActivityRailProvider>
    )
  })
  await act(async () => {
    await import('@/features/activity/components/ActivityTimelineList')
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
  test('shows the four rails, the question, and the métier doors', async () => {
    const { homeGreetings } = await import('./HomeView')
    const { doorHint } = await import('./HomeDoor')
    const { cleanup } = await renderHome()
    try {
      const panel = document.querySelector<HTMLElement>('[data-tab-panel][aria-label="Accueil"]')
      expect(panel?.className.split(/\s+/)).toContain('flex')
      expect(panel?.className).not.toContain('transition-')
      expect(panel?.className).not.toContain('opacity-')
      expect(document.body.textContent).toContain('Notifications')
      expect(document.body.textContent).toContain('Tâches')
      expect(document.body.textContent).toContain('Tâches assignées')
      expect(document.body.textContent).toContain('Activités')
      expect(document.body.textContent).toContain('Discuter avec Pierre')
      expect(document.body.textContent).toContain('Répondre aux réclamations')
      expect(document.body.textContent).toContain('Piloter les impayés')
      expect(document.body.textContent).toContain('Tout voir')
      const question = document.querySelector('header')
      const lines = [...(question?.querySelectorAll('p') ?? [])]
      expect(lines).toHaveLength(2)
      const greetings = homeGreetings('Pierre')
      expect(greetings).toContain('Pierre est prêt à vous aider,')
      expect(greetings).toContain('Pierre, à votre service,')
      expect(greetings).toContain('C’est Pierre,')
      expect(greetings).toContain('Ici Pierre,')
      expect(greetings).toContain(lines[0]?.textContent)
      expect(homeGreetings('Pierre', 'Alice')).toContain('Bonjour Alice,')
      expect(homeGreetings('Pierre')).not.toContain('Bonjour Alice,')
      expect(lines[0]?.textContent).not.toBe('Salut')
      expect(lines[0]?.textContent).not.toBe('Bonsoir')
      expect(lines[0]?.textContent).not.toBe('Bon après-midi')
      expect(lines[0]?.className).toContain('font-serif')
      expect(lines[0]?.className).toContain('text-5xl')
      expect(lines[0]?.className).toContain('leading-tight')
      expect(
        ['aujourd’hui', 'à présent', 'maintenant', 'à cet instant', 'en ce moment'].some(
          (moment) => lines[1]?.textContent === `Que souhaitez-vous faire ${moment} ?`
        )
      ).toBe(true)
      expect(lines[1]?.className).toContain('font-serif')
      expect(lines[1]?.className).toContain('text-4xl')
      const chatHint = doorHint('chat', 'Pierre')
      const automationsHint = doorHint('automations', 'Gustave')
      expect(chatHint).toBe(
        'Poser à Pierre une question sur vos pratiques, vos processus ou vos données.'
      )
      expect(automationsHint).toBe(
        'Définir quand et comment Gustave intervient sur vos dossiers et vos données.'
      )
      expect(chatHint).not.toContain('PIERRE')
      expect(automationsHint).not.toContain('PIERRE')
      expect(document.body.textContent).toContain(chatHint!)
      const hint = [...document.querySelectorAll('[data-door="chat"] span')].find(
        (node) => node.textContent === chatHint
      )
      expect(hint?.className).toContain('font-serif')
      expect(hint?.className).toContain('leading-4.75')
      expect(hint?.className).toContain('font-[350]')
      expect(document.body.textContent).toContain(
        'Répondre aux candidats et aux locataires, puis coordonner le suivi avec votre équipe.'
      )
      expect(document.querySelector('.home-tile')).toBeNull()
      expect(document.body.textContent).not.toContain('Rien de neuf')
      expect(document.querySelector('.size-28')).toBeNull()
      expect(document.querySelector('.size-40')).toBeNull()
      const nav = document.querySelector('[aria-label="Métiers"]')
      expect(nav?.className).toContain('grid-cols-4')
      expect(nav?.className).not.toContain('lg:grid-cols-3')
      const door = nav?.querySelector<HTMLElement>('[data-door="repayment"]')
      expect(door?.tagName).toBe('BUTTON')
      expect(door?.className).toContain('bg-home-repayment')
      expect(door?.className).toContain('text-home-ink')
      expect(door?.className).toContain('aspect-[1.618]')
      expect(door?.className).toContain('px-4')
      expect(door?.className).toContain('py-3')
      expect(nav?.className).toContain('items-start')
      const repaymentHintText =
        'Suivre les impayés, organiser les relances et piloter les plans d’apurement.'
      expect(door?.textContent).toContain(repaymentHintText)
      const repaymentHint = [...(door?.querySelectorAll('span') ?? [])].find(
        (node) => node.textContent === repaymentHintText
      )
      expect(repaymentHint?.className).toContain('font-serif')
      expect(repaymentHint?.className).toContain('line-clamp-3')
      const repaymentTitle = [...(door?.querySelectorAll('span') ?? [])].find(
        (node) => node.textContent === 'Piloter les impayés' && node.className.includes('text-lg')
      )
      expect(repaymentTitle?.className).toContain('text-lg')
      expect(repaymentTitle?.className).not.toContain('font-serif')
      expect(nav?.querySelector('[data-door="chat"]')?.className).toContain('bg-home-chat')
      expect(nav?.querySelector('[data-door="tickets"]')?.className).toContain('bg-home-tickets')
      expect(door?.querySelector('.size-5')?.parentElement).toBe(door)
      const board = nav?.parentElement?.parentElement
      expect(board?.className).toContain('max-w-7xl')
      const band = nav?.parentElement
      expect(band?.className).toContain('gap-4')
      const work = nav?.nextElementSibling
      expect(work?.parentElement).toBe(band)
      expect(work?.tagName).toBe('SECTION')
      expect(work?.getAttribute('aria-label')).toBe('Travail personnel')
      expect(work?.className).toContain('grid-cols-4')
      expect(work?.className).toContain('gap-4')
      expect(work?.className).toContain('items-start')
      expect(work?.className).not.toContain('lg:grid-cols-4')
      const cards = [...(work?.querySelectorAll('[data-slot="card"]') ?? [])]
      expect(cards).toHaveLength(4)
      expect(cards.map((card) => card.querySelector('h2')?.textContent)).toEqual([
        'Notifications',
        'Tâches',
        'Tâches assignées',
        'Activités'
      ])
      for (const card of cards) {
        expect(card.className).toContain('px-4')
        expect(card.className).toContain('py-3')
        expect(card.className).toContain('gap-1')
        expect(card.className).toContain('aspect-[1.618]')
        expect(card.className).not.toContain('h-full')
        expect(card.textContent).toContain('Tout voir')
        const seeAll = [...card.querySelectorAll('button')].find(
          (button) => button.textContent === 'Tout voir'
        )
        expect(seeAll?.className).toContain('h-7')
        expect(seeAll?.parentElement?.querySelector('svg.size-5')).not.toBeNull()
        expect(card.querySelector('svg.size-5')).not.toBeNull()
        const description = card.querySelector('[data-slot="empty-description"]')
        expect(description?.getAttribute('data-size')).toBe('sm')
        expect(description?.className).toContain('font-serif')
        expect(description?.className).toContain('[font-size:14px]')
        expect(description?.className).toContain('leading-4.75')
        expect(description?.className).toContain('font-[350]')
      }
    } finally {
      await cleanup()
    }
  })

  test('opens Discuter as the chat tab', async () => {
    const navigated: string[] = []
    const { act, cleanup } = await renderHome({
      onNavigate: (tab) => navigated.push(tab)
    })
    try {
      const chat = document.querySelector<HTMLButtonElement>('[data-door="chat"]')
      await act(async () => chat?.click())
      expect(navigated).toEqual(['chat'])
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
      const work = document.querySelector('[aria-label="Métiers"]')?.nextElementSibling
      expect(work?.className).toContain('items-start')
      const tasks = [...(work?.querySelectorAll('[data-slot="card"]') ?? [])].find(
        (card) => card.querySelector('h2')?.textContent === 'Tâches'
      )
      expect(tasks?.className).not.toContain('aspect-[1.618]')
      expect(tasks?.textContent).toContain('Relancer le locataire')
      const taskButton = [...(tasks?.querySelectorAll('button') ?? [])].find((button) =>
        button.textContent?.includes('Relancer le locataire')
      )
      expect(taskButton?.className).toContain('rounded-md')
      expect(taskButton?.className).toContain('border-border/80')
      expect(taskButton?.className).toContain('px-3')
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
        (node) => node.textContent === 'Tâches'
      )
      const button = [
        ...(heading?.closest('[data-slot="card"]')?.querySelectorAll('button') ?? [])
      ].find((node) => node.textContent === 'Tout voir')
      expect(heading?.textContent).toBe('Tâches')
      expect(button?.textContent).toBe('Tout voir')
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

  test('shows a flagged door with its pigment only when the module is granted', async () => {
    const { PANEL_FLAGS } = await import('@/shared/lib/tab-registry')
    const tones = {
      insurance: 'bg-home-insurance',
      relocation: 'bg-home-relocation',
      attributions: 'bg-home-attributions',
      ventes: 'bg-home-ventes'
    } as const satisfies Record<keyof typeof PANEL_FLAGS, string>

    const hidden = await renderHome()
    try {
      for (const tab of Object.keys(tones)) {
        expect(document.querySelector(`[data-door="${tab}"]`)).toBeNull()
      }
    } finally {
      await hidden.cleanup()
    }

    const shown = await renderHome({
      user: { ...user, moduleIds: Object.keys(PANEL_FLAGS) as UserPrincipal['moduleIds'] }
    })
    try {
      for (const [tab, tone] of Object.entries(tones)) {
        const door = document.querySelector(`[data-door="${tab}"]`)
        if (!PANEL_FLAGS[tab as keyof typeof PANEL_FLAGS]) {
          expect(door).toBeNull()
          continue
        }
        expect(door?.className).toContain(tone)
        expect(door?.className).toContain('text-home-ink')
      }
    } finally {
      await shown.cleanup()
    }
  })

  test('shows an update notice in the tile voice', async () => {
    const markItemRead = mock(async () => {})
    const { act, cleanup, rail } = await renderHome({
      feed: feedStub({
        markItemRead,
        items: [
          {
            id: 'upd-1',
            type: 'updates',
            source: 'update',
            ref: 'desktop-alpha',
            sender: 'Pierre',
            body: "Lancement de l'alpha de l'application Desktop",
            createdAt: '2026-10-10T10:00:00.000Z',
            isRead: false,
            boosts: {},
            target: {
              view: 'updates',
              slug: 'desktop-alpha',
              title: "Lancement de l'alpha de l'application Desktop",
              date: '2026-10-10'
            },
            contextLabel: 'Mises à jour',
            moduleLabel: 'Mises à jour',
            notificationId: 'upd-1'
          }
        ]
      })
    })
    try {
      const card = [...document.querySelectorAll('[data-slot="card"]')].find(
        (node) => node.querySelector('h2')?.textContent === 'Notifications'
      )
      const message = [...(card?.querySelectorAll('p') ?? [])].find((node) =>
        node.textContent?.includes("Lancement de l'alpha")
      )
      expect(message?.className).toContain('font-serif')
      expect(message?.className).toContain('leading-4.75')
      expect(message?.className).toContain('line-clamp-2')
      expect(message?.className).toContain('text-muted-foreground')
      expect(message?.className).not.toContain('text-base')
      const time = card?.querySelector('time')
      expect(time?.closest('p')?.className).toContain('text-xs')
      expect(time?.closest('p')?.className).toContain('leading-4')
      expect(time?.closest('p')?.className).not.toContain('font-mono')
      expect(time?.parentElement?.className).toContain('tabular-nums')
      expect(time?.textContent).not.toContain('Pierre')
      expect(time?.parentElement?.textContent).toContain('Pierre')
      expect(message?.textContent).not.toContain(time?.textContent ?? '—')
      expect(time && message && time.compareDocumentPosition(message)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
      expect(message?.closest('li')?.className).toContain('rounded-md')
      expect(message?.closest('li')?.querySelector('div')?.className).toContain('px-3')
      expect(message?.closest('ul')?.className).toContain('gap-2')
      const avatar = card?.querySelector('[data-slot="avatar"]')
      expect(avatar?.className).toContain('size-5')
      expect(message && avatar && message.compareDocumentPosition(avatar)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
      expect(card?.className).not.toContain('aspect-[1.618]')
      const tasks = [...document.querySelectorAll('[data-slot="card"]')].find(
        (node) => node.querySelector('h2')?.textContent === 'Tâches'
      )
      expect(tasks?.querySelector('[data-slot="empty-description"]')?.className).toContain(
        'font-serif'
      )
      expect(tasks?.className).toContain('aspect-[1.618]')
      await act(async () => {
        message?.closest<HTMLElement>('li[role="button"]')?.click()
      })
      expect(rail.readerTarget).toEqual({
        kind: 'update',
        slug: 'desktop-alpha',
        title: "Lancement de l'alpha de l'application Desktop",
        date: '2026-10-10'
      })
      expect(markItemRead).toHaveBeenCalledWith('upd-1')
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
      expect(document.querySelector('.activity-motion-list')).toBeNull()
    } finally {
      await cleanup()
    }
  })
})
