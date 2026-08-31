import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import { JSDOM } from 'jsdom'

import { clearUpdatesCache } from '@/features/updates/lib/github-updates'
import type { ActiviteListItem, GetActivitiesParams } from '@/shared/types/activites'
import type { Settings } from '@/shared/types/settings'

import { useActivityFeed } from './useActivityFeed'

const DOM_GLOBALS = ['document', 'window', 'HTMLElement', 'getComputedStyle'] as const

let savedGlobals: Partial<Record<(typeof DOM_GLOBALS)[number], unknown>> | null = null
let savedApi: unknown
let savedApiOwner: { api?: unknown } | undefined

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  // Other suites leave behind a bare `{ api }` stub in place of `window`, which
  // has no `addEventListener` for the updates feed to attach its focus listener
  // to. Only reuse an existing DOM if it is a real one.
  const existing = globals.window as { addEventListener?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' && typeof existing?.addEventListener === 'function'

  if (!hasWorkingDom) {
    savedGlobals = {}
    for (const key of DOM_GLOBALS) savedGlobals[key] = globals[key]
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globals.document = dom.window.document
    globals.window = dom.window
    globals.HTMLElement = dom.window.HTMLElement
    globals.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  }

  savedApiOwner = globals.window as { api?: unknown }
  savedApi = savedApiOwner.api
  // `act` refuses to flush updates unless the environment opts in.
  ;(globals as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

// Other suites in this process assert on `document` being absent, and read the
// updates index through the cache this one fills, so put everything back.
afterAll(() => {
  clearUpdatesCache()
  if (savedApiOwner) savedApiOwner.api = savedApi
  if (!savedGlobals) return
  const globals = globalThis as Record<string, unknown>
  for (const key of DOM_GLOBALS) {
    if (savedGlobals[key] === undefined) delete globals[key]
    else globals[key] = savedGlobals[key]
  }
  savedGlobals = null
})

function activityRow(id: number, lu: boolean): ActiviteListItem {
  return {
    id,
    date_creation: '2026-07-26T10:00:00.000Z',
    rattachement: 'tickets:REC-1',
    auteur: 'agent:alice',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [{ destinataire: 'user:alice@pierre.test', lu, boost: null }],
    contenu: 'coucou',
    my: { destinataire: 'user:alice@pierre.test', lu, boost: null }
  }
}

type FeedApi = ReturnType<typeof useActivityFeed>

const UPDATE_ENTRY = {
  slug: 'v2-arrives',
  title: 'La v2 arrive',
  date: '2026-07-01'
}

async function renderFeed(
  options: {
    updates?: (typeof UPDATE_ENTRY)[]
    settings?: Partial<Settings>
  } = {}
) {
  const { act, useState } = await import('react')
  const { createRoot } = await import('react-dom/client')

  const state = {
    rows: [activityRow(1, false), activityRow(2, false)],
    getActivitiesCalls: 0,
    activityRequests: [] as GetActivitiesParams[],
    patchedIds: [] as number[],
    savedSettings: [] as Settings[]
  }

  window.api = {
    getActivities: async (params: GetActivitiesParams) => {
      state.getActivitiesCalls += 1
      state.activityRequests.push(params)
      const offset = params.offset ?? 0
      const limit = params.limit ?? state.rows.length
      // A fresh array each time, the way an IPC round-trip would deliver it.
      return {
        data: state.rows.slice(offset, offset + limit).map((row) => ({ ...row }))
      }
    },
    patchActivity: async ({ id }: { id: number }) => {
      state.patchedIds.push(id)
      return { ok: true }
    },
    saveSettings: async (next: Settings) => {
      state.savedSettings.push(next)
    },
    // Keeps the changelog feed off the network.
    fetchUrl: async () => JSON.stringify([{ folder: 'changelog', entries: options.updates ?? [] }])
  } as unknown as typeof window.api

  const renders: FeedApi[] = []

  function Harness() {
    // App.tsx holds settings in state and writes them back through
    // onSettingsChange, which is how an update's read status sticks.
    const [settings, setSettings] = useState<Settings>({
      url: 'https://pierre.test',
      email: 'alice@pierre.test',
      ...options.settings
    })
    renders.push(
      useActivityFeed({
        settings,
        onSettingsChange: setSettings,
        userLogin: 'alice@pierre.test',
        isLoggedIn: true
      })
    )
    return null
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<Harness />)
  })
  // Let the mount effects and their promises settle.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })

  return {
    state,
    last: () => renders[renders.length - 1]!,
    settle: async (fn: () => Promise<void>) => {
      await act(async () => {
        await fn()
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('useActivityFeed owns the only notification store', () => {
  test('fetches the activity list once per mount, not once per consumer', async () => {
    const harness = await renderFeed()

    expect(harness.state.getActivitiesCalls).toBe(1)

    await harness.cleanup()
  })

  test('exposes the same store that backs its own rows and refresh', async () => {
    const harness = await renderFeed()
    const feed = harness.last()

    expect(feed.notifications.rows).toBe(feed.rows)
    expect(feed.notifications.refresh).toBe(feed.refresh)
    expect(feed.notifications.createActivity).toBe(feed.createActivity)

    await harness.cleanup()
  })

  test('marking read through the store moves the badge the sidebar and mascot read', async () => {
    const harness = await renderFeed()

    // `feed.unreadCount` is what drives both the sidebar badge and, over IPC,
    // the mascot's. It used to be backed by a second store that never saw this.
    expect(harness.last().unreadCount).toBe(2)
    expect(harness.last().notifications.unreadCount).toBe(2)

    harness.state.rows = [activityRow(1, true), activityRow(2, true)]
    const markAllReadForRef = harness.last().notifications.markAllReadForRef
    await harness.settle(() => markAllReadForRef('tickets', 'REC-1'))

    expect(harness.last().notifications.unreadCount).toBe(0)
    expect(harness.last().unreadCount).toBe(0)

    await harness.cleanup()
  })

  test('the store the views consume is never empty when the feed has rows', async () => {
    const harness = await renderFeed()
    const feed = harness.last()

    // Guards the failure mode of this rewiring: a view handed an undefined or
    // blank store would render an empty inbox rather than crash.
    expect(feed.notifications.rows).toHaveLength(2)
    expect(feed.notifications.items).toHaveLength(2)
    expect(feed.items).toHaveLength(2)
    expect(typeof feed.notifications.hasUnreadFor).toBe('function')
    expect(typeof feed.notifications.markAllReadForRef).toBe('function')
    expect(typeof feed.notifications.createActivity).toBe('function')
    expect(feed.notifications.hasUnreadFor('tickets', 'REC-1')).toBe(true)

    await harness.cleanup()
  })

  test('loads selected authors, keeps overlapping inbox rows as activity, and persists scope changes', async () => {
    const harness = await renderFeed({
      settings: {
        showOwnActivity: true,
        followedActivityAuthors: ['user:bob@pierre.test']
      }
    })

    expect(harness.state.activityRequests).toContainEqual({
      url: 'https://pierre.test',
      auteurs: ['user:alice@pierre.test', 'user:bob@pierre.test'],
      limit: 50,
      offset: 0
    })
    const items = harness.last().items
    expect(items.filter((item) => item.source === 'mention')).toHaveLength(2)
    const authored = items.filter((item) => item.source === 'activity')
    expect(authored).toHaveLength(2)
    expect(authored.map((item) => item.id).sort()).toEqual([1, 2])
    expect(authored.every((item) => item.row != null)).toBe(true)
    expect(items).toHaveLength(4)

    await harness.settle(() => harness.last().setShowOwnActivity(false))
    expect(harness.state.savedSettings.at(-1)).toMatchObject({
      showOwnActivity: false,
      followedActivityAuthors: ['user:bob@pierre.test']
    })

    await harness.settle(() =>
      harness.last().setFollowedActivityAuthors(['user:claire@pierre.test'])
    )
    expect(harness.state.savedSettings.at(-1)).toMatchObject({
      showOwnActivity: false,
      followedActivityAuthors: ['user:claire@pierre.test']
    })

    await harness.cleanup()
  })
})

describe('the mention and changelog read models stay separate', () => {
  test('the feed badge folds in updates; the store the views consume does not', async () => {
    const harness = await renderFeed({ updates: [UPDATE_ENTRY] })

    // This is why the views get the raw store rather than the feed's wrappers:
    // a tickets badge must not count changelog updates.
    expect(harness.last().notifications.unreadCount).toBe(2)
    expect(harness.last().unreadCount).toBe(3)
    expect(harness.last().items).toHaveLength(3)

    await harness.cleanup()
  })

  test('marking an update read touches settings, not a single mention', async () => {
    const harness = await renderFeed({ updates: [UPDATE_ENTRY] })

    const updateItem = harness
      .last()
      .items.find((item) => typeof item.id === 'string' && item.id.includes(UPDATE_ENTRY.slug))!
    expect(updateItem).toBeDefined()

    const markItemRead = harness.last().markItemRead
    await harness.settle(() => markItemRead(updateItem.id))

    expect(harness.state.savedSettings.at(-1)?.updatesReadSlugs).toEqual([UPDATE_ENTRY.slug])
    expect(harness.state.patchedIds).toEqual([])
    // The update dropped out of the count; the two mentions did not.
    expect(harness.last().unreadCount).toBe(2)
    expect(harness.last().notifications.unreadCount).toBe(2)

    await harness.cleanup()
  })

  test('marking an update unread removes the slug from settings', async () => {
    const harness = await renderFeed({ updates: [UPDATE_ENTRY] })

    const updateItem = harness
      .last()
      .items.find((item) => typeof item.id === 'string' && item.id.includes(UPDATE_ENTRY.slug))!
    await harness.settle(() => harness.last().markItemRead(updateItem.id))
    expect(harness.last().unreadCount).toBe(2)

    await harness.settle(() => harness.last().markUnread(updateItem.id))

    expect(harness.state.savedSettings.at(-1)?.updatesReadSlugs).toEqual([])
    expect(harness.state.patchedIds).toEqual([])
    expect(harness.last().unreadCount).toBe(3)
    expect(harness.last().notifications.unreadCount).toBe(2)

    await harness.cleanup()
  })

  test('hides read changelog updates until reads are shown', async () => {
    const harness = await renderFeed({ updates: [UPDATE_ENTRY] })

    const updateItem = harness
      .last()
      .items.find((item) => typeof item.id === 'string' && item.id.includes(UPDATE_ENTRY.slug))!
    await harness.settle(() => harness.last().markItemRead(updateItem.id))

    expect(
      harness
        .last()
        .items.some((item) => typeof item.id === 'string' && item.id.includes(UPDATE_ENTRY.slug))
    ).toBe(false)

    await harness.settle(async () => {
      harness.last().setShowRead(true)
    })

    expect(
      harness
        .last()
        .items.some((item) => typeof item.id === 'string' && item.id.includes(UPDATE_ENTRY.slug))
    ).toBe(true)

    await harness.cleanup()
  })

  test('marking a mention read touches the activity, not the read slugs', async () => {
    const harness = await renderFeed({ updates: [UPDATE_ENTRY] })

    harness.state.rows = [activityRow(1, true), activityRow(2, false)]
    const markItemRead = harness.last().markItemRead
    await harness.settle(() => markItemRead(1))

    expect(harness.state.patchedIds).toEqual([1])
    expect(harness.state.savedSettings).toEqual([])
    // One mention read, one still unread, and the update still unread.
    expect(harness.last().notifications.unreadCount).toBe(1)
    expect(harness.last().unreadCount).toBe(2)

    await harness.cleanup()
  })
})

describe('inbox paging and the Lues toggle', () => {
  test('loads the unread inbox in pages of 50', async () => {
    const harness = await renderFeed()

    expect(harness.state.activityRequests[0]).toEqual({
      url: 'https://pierre.test',
      inbox: true,
      unread_only: true,
      limit: 50,
      offset: 0
    })
    expect(harness.last().showRead).toBe(false)
    expect(harness.last().hasMoreNotifications).toBe(false)

    await harness.cleanup()
  })

  test('revealing reads refetches the first page without unread_only', async () => {
    const harness = await renderFeed()

    await harness.settle(async () => {
      harness.last().setShowRead(true)
    })

    expect(harness.last().showRead).toBe(true)
    expect(harness.state.activityRequests).toContainEqual({
      url: 'https://pierre.test',
      inbox: true,
      unread_only: false,
      limit: 50,
      offset: 0
    })

    await harness.cleanup()
  })

  test('loadMore appends the next inbox page by offset', async () => {
    const harness = await renderFeed()
    harness.state.rows = Array.from({ length: 60 }, (_, index) => activityRow(index + 1, false))

    await harness.settle(() => harness.last().refresh())

    expect(harness.last().notifications.rows).toHaveLength(50)
    expect(harness.last().hasMoreNotifications).toBe(true)

    await harness.settle(() => harness.last().loadMoreNotifications())

    expect(harness.state.activityRequests.at(-1)).toEqual({
      url: 'https://pierre.test',
      inbox: true,
      unread_only: true,
      limit: 50,
      offset: 50
    })
    expect(harness.last().notifications.rows).toHaveLength(60)
    expect(harness.last().hasMoreNotifications).toBe(false)

    await harness.cleanup()
  })

  test('loadMore appends the next authored page by offset', async () => {
    const harness = await renderFeed({
      settings: {
        showOwnActivity: false,
        followedActivityAuthors: ['user:bob@pierre.test']
      }
    })
    harness.state.rows = Array.from({ length: 60 }, (_, index) => activityRow(index + 1, false))

    await harness.settle(() =>
      harness.last().setFollowedActivityAuthors(['user:claire@pierre.test'])
    )

    expect(harness.last().hasMoreActivities).toBe(true)

    await harness.settle(() => harness.last().loadMoreActivities())

    expect(harness.state.activityRequests.at(-1)).toEqual({
      url: 'https://pierre.test',
      auteurs: ['user:claire@pierre.test'],
      limit: 50,
      offset: 50
    })
    expect(harness.last().hasMoreActivities).toBe(false)

    await harness.cleanup()
  })
})

/**
 * Every `useNotifications` call is a separate copy of the activity list, with its
 * own fetch and its own `refresh`. The app-wide one belongs to `useActivityFeed`;
 * the other two are deliberately narrow, context-scoped fetches. If this list
 * grows, the app has more than one badge source again.
 */
const ALLOWED_CALLERS = [
  'features/activity/components/ActivityContextNested.tsx',
  'features/activity/components/RepaymentActivityDrawer.tsx',
  'features/activity/hooks/use-notifications.test.tsx',
  'features/activity/hooks/useActivityFeed.ts'
]

describe('useNotifications call sites', () => {
  test('are only the ones we know about', async () => {
    const srcDir = resolve(import.meta.dir, '../../..')
    const glob = new Bun.Glob('**/*.{ts,tsx}')

    // The hook's own definition, and this file, which names the string it greps for.
    const ignored = new Set([
      'features/activity/hooks/use-notifications.ts',
      relative(srcDir, import.meta.path)
    ])

    const callers: string[] = []
    for await (const file of glob.scan({ cwd: srcDir })) {
      const path = relative(srcDir, resolve(srcDir, file))
      if (ignored.has(path)) continue
      if (readFileSync(resolve(srcDir, file), 'utf8').includes('useNotifications(')) {
        callers.push(path)
      }
    }

    expect(callers.sort()).toEqual(ALLOWED_CALLERS)
  })

  test('do not include App.tsx, which reads feed.notifications instead', () => {
    const appSource = readFileSync(resolve(import.meta.dir, '../../../app/App.tsx'), 'utf8')
    expect(appSource).not.toContain('useNotifications')
    expect(appSource).toContain('feed.notifications')
  })
})
