import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'

import { useResolvedUiSettings } from '@/contexts/UiSettingsContext'
import { ActivityNotificationRow } from '@/features/activity/components/ActivityNotificationRow'
import { selectAuthoredActivityItems } from '@/features/activity/components/ActivityScopeControls'
import { ActivityTimelineList } from '@/features/activity/components/ActivityTimelineList'
import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { activityToTarget } from '@/features/activity/lib/notification-types'
import { HomeActionBuckets } from '@/features/home/HomeActionBuckets'
import { HomeDoor } from '@/features/home/HomeDoor'
import {
  BlockprintCardActivity,
  BlockprintCompactViewNotifications,
  BlockprintDelegationArrow,
  BlockprintSuccessStateForTask
} from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import { isPanelTabVisible, moduleIdForTab } from '@/shared/lib/tab-registry'
import type { Tab } from '@/shared/lib/tabs'
import { resolveHomeSettings } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'
import type { UserPrincipal } from '@/shared/types/users'

const HOME_TILES = [
  'chat',
  'tickets',
  'repayment',
  'automations',
  'bulk',
  'about',
  'insurance-attestation',
  'relocation',
  'attributions',
  'ventes'
] as const satisfies readonly Tab[]

/** 4 × 19 rem rails + 3 × gap-2. */
const HOME_BOARD = 'mx-auto flex w-full max-w-[calc(76rem+1.5rem)] flex-col gap-4'
const HOME_TRACK = 'grid w-full grid-cols-4 gap-2'

const HOME_RAIL = 'border-border flex h-fit min-w-0 flex-col self-start rounded-md border'

interface Props {
  hidden: boolean
  onNavigate: (tab: Tab) => void
  agentName: string
  user: UserPrincipal
  feed: ActivityFeedApi
  mine: ActionActivity[]
  delegated: ActionActivity[]
  refresh: () => Promise<void>
}

function sortNotifications(items: ActivityNotificationItem[]): ActivityNotificationItem[] {
  return [...items].sort((a, b) => {
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (byDate !== 0) return byDate
    return String(b.id).localeCompare(String(a.id))
  })
}

function HomeFeedRail({
  title,
  items,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onSeeAll,
  onOpen,
  onMarkUnread
}: {
  title: string
  items: ActivityNotificationItem[]
  emptyTitle: string
  emptyDescription: string
  emptyIcon: ReactNode
  onSeeAll: () => void
  onOpen: (item: ActivityNotificationItem) => void
  onMarkUnread: (item: ActivityNotificationItem) => void
}) {
  return (
    <section className={HOME_RAIL}>
      <div className="flex items-center gap-2 px-4 py-2">
        <h2 className="text-foreground m-0 text-sm leading-5 font-medium">{title}</h2>
        <Button type="button" variant="outline" size="xs" className="ms-auto" onClick={onSeeAll}>
          Tout voir
        </Button>
      </div>
      {items.length === 0 ? (
        <Empty className="flex-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul>
          {items.map((item) => (
            <ActivityNotificationRow
              key={`${item.source}:${item.id}`}
              item={item}
              onOpen={onOpen}
              onMarkUnread={onMarkUnread}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function HomeView({
  hidden,
  onNavigate,
  agentName,
  user,
  feed,
  mine,
  delegated,
  refresh
}: Props) {
  const { openRail, openTasksRail, openContextTarget, contextTarget, tasksOpen } = useActivityRail()
  const excerpts = resolveHomeSettings(useResolvedUiSettings())

  const notificationItems = useMemo(
    () =>
      sortNotifications(
        feed.items.filter((item) => {
          if (item.source === 'activity') return false
          return feed.showRead || !item.isRead
        })
      ).slice(0, excerpts.notifications),
    [excerpts.notifications, feed.items, feed.showRead]
  )

  const activityItems = useMemo(
    () =>
      sortNotifications(
        selectAuthoredActivityItems(feed.items, user.email, {
          followedActivityAuthors: feed.followedActivityAuthors,
          showOwnActivity: feed.showOwnActivity
        })
      ).slice(0, excerpts.activities),
    [
      excerpts.activities,
      feed.followedActivityAuthors,
      feed.items,
      feed.showOwnActivity,
      user.email
    ]
  )

  const visibleMine = useMemo(() => mine.slice(0, excerpts.mine), [excerpts.mine, mine])
  const visibleDelegated = useMemo(
    () => delegated.slice(0, excerpts.delegated),
    [delegated, excerpts.delegated]
  )

  const visibleTiles = HOME_TILES.filter((tab) => {
    if (!isPanelTabVisible(tab)) return false
    if (tab === 'chat') return true
    const moduleId = moduleIdForTab(tab)
    return moduleId === null || user.moduleIds.includes(moduleId)
  })

  const hadInspector = useRef(false)
  useEffect(() => {
    if (contextTarget) {
      hadInspector.current = true
      return
    }
    if ((hidden && !tasksOpen) || !hadInspector.current) return
    hadInspector.current = false
    const id = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(id)
  }, [contextTarget, hidden, refresh, tasksOpen])

  const openAction = useCallback(
    (action: ActionActivity) => {
      const target = activityToTarget({
        ...action.row,
        my: null,
        read: false,
        reaction: null
      })
      if (target) openContextTarget(target)
    },
    [openContextTarget]
  )

  const openNotification = useCallback(
    (item: ActivityNotificationItem) => {
      if (item.type === 'automations' && item.target?.view === 'automations') {
        if (item.readerContent?.trim()) {
          void window.api?.openAutomationReport({ html: item.readerContent })
        }
        if (!item.isRead) void feed.markItemRead(item.id)
        return
      }
      if (
        !item.target ||
        (item.target.view !== 'tickets' &&
          item.target.view !== 'repayment' &&
          item.target.view !== 'updates')
      ) {
        return
      }
      openContextTarget(item.target)
      if (!item.isRead) void feed.markItemRead(item.id)
    },
    [feed, openContextTarget]
  )

  return (
    <div
      data-tab-panel
      data-hidden={hidden || undefined}
      aria-label="Accueil"
      className={cn(
        'bg-background absolute inset-0 flex min-h-0 flex-col overflow-y-auto p-4 transition-[opacity,translate] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]',
        hidden
          ? 'pointer-events-none z-0 -translate-y-1.5 opacity-0 duration-180 ease-[cubic-bezier(0.4,0,1,1)]'
          : 'z-1 translate-y-0 opacity-100',
        'motion-reduce:translate-y-0 motion-reduce:duration-150'
      )}
    >
      <div className={HOME_BOARD}>
        <nav className="grid w-full grid-cols-3 gap-2" aria-label="Métiers">
          {visibleTiles.map((tab) => (
            <HomeDoor key={tab} tab={tab} agentName={agentName} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className={cn(HOME_TRACK, 'items-start')}>
          <HomeFeedRail
            title="Mes notifications"
            items={notificationItems}
            emptyTitle="Aucune notification"
            emptyDescription="Vous êtes à jour."
            emptyIcon={<BlockprintCompactViewNotifications />}
            onSeeAll={() => openRail('notifications')}
            onOpen={openNotification}
            onMarkUnread={(item) => void feed.markUnread(item.id)}
          />

          <section className={HOME_RAIL}>
            <div className="flex items-center gap-2 px-4 py-2">
              <h2 className="text-foreground m-0 text-sm leading-5 font-medium">Mes tâches</h2>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="ms-auto"
                onClick={() => openTasksRail('mine')}
              >
                Tout voir
              </Button>
            </div>
            <HomeActionBuckets
              actions={visibleMine}
              emptyTitle="Aucune tâche"
              emptyDescription="Rien d’ouvert."
              emptyIcon={<BlockprintSuccessStateForTask />}
              fit
              onOpen={openAction}
            />
          </section>

          <section className={HOME_RAIL}>
            <div className="flex items-center gap-2 px-4 py-2">
              <h2 className="text-foreground m-0 text-sm leading-5 font-medium">
                Tâches que j’ai assignées
              </h2>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="ms-auto"
                onClick={() => openTasksRail('delegated')}
              >
                Tout voir
              </Button>
            </div>
            <HomeActionBuckets
              actions={visibleDelegated}
              emptyTitle="Aucune tâche assignée"
              emptyDescription="Rien de délégué."
              emptyIcon={<BlockprintDelegationArrow />}
              fit
              onOpen={openAction}
            />
          </section>

          <section className={HOME_RAIL}>
            <div className="flex items-center gap-2 px-4 py-2">
              <h2 className="text-foreground m-0 text-sm leading-5 font-medium">Activités</h2>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="ms-auto"
                onClick={() => openRail('activities')}
              >
                Tout voir
              </Button>
            </div>
            <ActivityTimelineList
              items={activityItems}
              emptyCopy={{
                title: 'Aucune activité',
                description: 'Aucune activité récente pour les personnes suivies.'
              }}
              emptyIcon={<BlockprintCardActivity />}
              fit
              onOpen={openNotification}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
