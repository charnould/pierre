import { Activity, Bell, XIcon } from 'lucide-react'
import type { MouseEvent, RefObject } from 'react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ActivityNotificationRow } from '@/features/activity/components/ActivityNotificationRow'
import { activityNotificationsDismissGuard } from '@/features/activity/components/ActivityNotificationsTrigger'
import {
  ActivityFollowList,
  ActivityScopeControls,
  activityAuthorKey,
  followedPeopleCount
} from '@/features/activity/components/ActivityScopeControls'
import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { CartoonNotificationGrouped } from '@/shared/components/icons/koboyo-empty'
import {
  INBOX_DRAWER_WIDTH_CLASS,
  INSPECTOR_DRAWER_CLASS
} from '@/shared/components/inspector/inspector-split'
import { Button } from '@/shared/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

const ActivityContextNested = lazy(() =>
  import('@/features/activity/components/ActivityContextNested').then((module) => ({
    default: module.ActivityContextNested
  }))
)
const ActivityTimelineList = lazy(() =>
  import('@/features/activity/components/ActivityTimelineList').then((module) => ({
    default: module.ActivityTimelineList
  }))
)

type ActivityTab = 'notifications' | 'activities'

const EMPTY_ROUTINE_NAMES: Record<string, string> = {}

const ACTIVITY_DRAWER_CLASS = [
  INBOX_DRAWER_WIDTH_CLASS,
  'rounded-md border',
  'data-[swipe-direction=left]:rounded-md data-[swipe-direction=left]:rounded-r-md data-[swipe-direction=left]:border',
  '[--drawer-bleed-background:transparent] [--drawer-inset:0.75rem]'
].join(' ')

interface Props {
  feed: ActivityFeedApi
  url: string | undefined
  userLogin: string
}

interface ActivityListProps {
  items: ActivityNotificationItem[]
  emptyCopy: { title: string; description: string }
  routineNames: Record<string, string>
  onOpen: (item: ActivityNotificationItem) => void
  onMarkUnread: (item: ActivityNotificationItem) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadMoreEnabled?: boolean
}

function ListSentinel({
  enabled,
  onVisible,
  rootRef
}: {
  enabled: boolean
  onVisible: () => void
  rootRef: RefObject<HTMLDivElement | null>
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible()
      },
      { root, rootMargin: '120px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, onVisible, rootRef])

  return <div ref={sentinelRef} data-activity-list-sentinel="" aria-hidden className="h-px" />
}

function sortNotifications(items: ActivityNotificationItem[]): ActivityNotificationItem[] {
  return [...items].sort((a, b) => {
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (byDate !== 0) return byDate
    return String(b.id).localeCompare(String(a.id))
  })
}

function ActivityList({
  items,
  emptyCopy,
  routineNames,
  onOpen,
  onMarkUnread,
  onLoadMore,
  hasMore = false,
  loadMoreEnabled = false
}: ActivityListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const handleLoadMore = useCallback(() => {
    onLoadMore?.()
  }, [onLoadMore])

  return (
    <div ref={scrollRef} className="scroll-fade min-h-0 flex-1 overflow-y-auto">
      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CartoonNotificationGrouped />
            </EmptyMedia>
            <EmptyTitle>{emptyCopy.title}</EmptyTitle>
            <EmptyDescription>{emptyCopy.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-w-0 flex-col">
          <ul className="activity-motion-list flex min-w-0 flex-col">
            {items.map((item) => (
              <ActivityNotificationRow
                key={`${item.source}:${item.id}`}
                item={item}
                routineName={
                  item.target?.view === 'automations'
                    ? routineNames[item.target.automationId]
                    : undefined
                }
                onOpen={onOpen}
                onMarkUnread={onMarkUnread}
              />
            ))}
          </ul>
          {onLoadMore ? (
            <ListSentinel
              enabled={loadMoreEnabled && hasMore}
              onVisible={handleLoadMore}
              rootRef={scrollRef}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

function ActivityFollowEmpty({ feed, url, userLogin }: Props) {
  return (
    <div className="scroll-fade min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-1 px-4 py-2">
        <h2 className="text-foreground text-sm leading-5 font-medium">Qui suivre</h2>
        <p className="text-muted-foreground text-xs leading-4">Leurs actions apparaissent ici.</p>
      </div>
      <ActivityFollowList feed={feed} url={url} userLogin={userLogin} />
    </div>
  )
}

export function ActivityPanel({ feed, url, userLogin }: Props) {
  const {
    items,
    unreadCount,
    markItemRead,
    markUnread,
    markAllRead,
    showRead,
    setShowRead,
    loadMoreNotifications,
    loadMoreActivities,
    hasMoreNotifications,
    hasMoreActivities
  } = feed
  const { open, setOpen, contextTarget, closeContextTarget, openContextTarget } = useActivityRail()
  const contextOpen = contextTarget != null

  const [activeTab, setActiveTab] = useState<ActivityTab>('notifications')
  const [routineNames, setRoutineNames] = useState<Record<string, string>>({})
  const routineIdsKey = useMemo(
    () =>
      items
        .flatMap((item) => (item.target?.view === 'automations' ? [item.target.automationId] : []))
        .sort()
        .join('\n'),
    [items]
  )
  const hasFollowedAnyone = followedPeopleCount(feed, userLogin) > 0

  useEffect(() => {
    if (!routineIdsKey || !open || !url || !window.api?.getAutomations) return

    let cancelled = false
    const routineIds = new Set(routineIdsKey.split('\n'))
    void window.api.getAutomations({ url }).then((response) => {
      if (cancelled || !response) return
      const next: Record<string, string> = {}
      for (const automation of response.data) {
        if (!routineIds.has(automation.id)) continue
        next[automation.id] = automation.name
      }
      setRoutineNames(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, routineIdsKey, url])

  const resolvedRoutineNames = useMemo(
    () => (routineIdsKey ? routineNames : EMPTY_ROUTINE_NAMES),
    [routineIdsKey, routineNames]
  )

  const closePanel = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && activityNotificationsDismissGuard.current) return
      if (nextOpen) {
        setOpen(true)
      } else {
        closePanel()
      }
    },
    [closePanel, setOpen]
  )

  const handleCloseButton = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      closePanel()
    },
    [closePanel]
  )

  const notificationItems = useMemo(
    () =>
      sortNotifications(
        items.filter((item) => {
          if (item.source === 'activity') return false
          return showRead || !item.isRead
        })
      ),
    [items, showRead]
  )

  const activityItems = useMemo(() => {
    const ownAuthor = activityAuthorKey(userLogin)
    const followed = new Set(feed.followedActivityAuthors)
    return items.filter((item) => {
      if (item.source !== 'activity') return false
      const author = activityAuthorKey(item.sender)
      return author === ownAuthor ? feed.showOwnActivity : followed.has(author)
    })
  }, [feed.followedActivityAuthors, feed.showOwnActivity, items, userLogin])

  const handleContextOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) closeContextTarget()
    },
    [closeContextTarget]
  )

  const handleMarkAllRead = useCallback(() => {
    void markAllRead()
  }, [markAllRead])

  const handleOpenItem = useCallback(
    (item: ActivityNotificationItem) => {
      if (item.type === 'automations' && item.target?.view === 'automations') {
        setOpen(false)
        if (item.readerContent?.trim()) {
          void window.api?.openAutomationReport({ html: item.readerContent })
        }
        if (!item.isRead) void markItemRead(item.id)
        return
      }

      if (!item.target) return
      if (
        item.target.view !== 'tickets' &&
        item.target.view !== 'repayment' &&
        item.target.view !== 'updates'
      ) {
        return
      }

      openContextTarget(item.target)
      if (!item.isRead) void markItemRead(item.id)
    },
    [markItemRead, openContextTarget, setOpen]
  )

  const handleMarkUnread = useCallback(
    (item: ActivityNotificationItem) => {
      void markUnread(item.id)
    },
    [markUnread]
  )

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="left">
        <DrawerContent className={ACTIVITY_DRAWER_CLASS}>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ActivityTab)}
            className="min-h-0 min-w-0 flex-1 gap-0"
          >
            <DrawerHeader
              data-activity-motion="header"
              className="no-drag flex-row items-center gap-2 border-b px-4 py-2 text-start"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <DrawerTitle className="sr-only">Notifications</DrawerTitle>
              <TabsList
                aria-label="Notifications et activités"
                className="relative grid grid-cols-2"
              >
                <span aria-hidden data-active-tab={activeTab} className="activity-tab-indicator" />
                <TabsTrigger
                  value="notifications"
                  className="z-10 data-active:bg-transparent data-active:shadow-none"
                >
                  <Bell />
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="z-10 data-active:bg-transparent data-active:shadow-none"
                >
                  <Activity />
                  Activités
                </TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="ms-auto"
                aria-label="Fermer les notifications"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleCloseButton}
              >
                <XIcon aria-hidden />
              </Button>
            </DrawerHeader>
            {activeTab === 'notifications' || (activeTab === 'activities' && hasFollowedAnyone) ? (
              <div
                data-activity-motion="actions"
                className="no-drag flex shrink-0 items-center gap-1 px-4 py-1.5"
                onPointerDown={(event) => event.stopPropagation()}
              >
                {activeTab === 'notifications' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRead(!showRead)}
                    >
                      {showRead
                        ? 'Afficher uniquement les non-lues'
                        : 'Afficher les lues et non-lues'}
                    </Button>
                    {unreadCount > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ms-auto"
                        onClick={handleMarkAllRead}
                      >
                        Tout lu
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <ActivityScopeControls feed={feed} url={url} userLogin={userLogin} />
                )}
              </div>
            ) : null}

            <TabsContent
              value="notifications"
              data-activity-motion="content"
              className="flex min-h-0 flex-col overflow-hidden"
            >
              <ActivityList
                items={notificationItems}
                emptyCopy={{
                  title: 'Aucune notification',
                  description: 'Vous êtes à jour.'
                }}
                routineNames={resolvedRoutineNames}
                onOpen={handleOpenItem}
                onMarkUnread={handleMarkUnread}
                onLoadMore={loadMoreNotifications}
                hasMore={hasMoreNotifications}
                loadMoreEnabled={open && activeTab === 'notifications'}
              />
            </TabsContent>
            <TabsContent
              value="activities"
              data-activity-motion="content"
              className="flex min-h-0 flex-col overflow-hidden"
            >
              {hasFollowedAnyone ? (
                <Suspense fallback={null}>
                  <ActivityTimelineList
                    items={activityItems}
                    emptyCopy={{
                      title: 'Aucune activité',
                      description: 'Aucune activité récente pour les personnes suivies.'
                    }}
                    onOpen={handleOpenItem}
                    onLoadMore={loadMoreActivities}
                    hasMore={hasMoreActivities}
                    loadMoreEnabled={open && activeTab === 'activities'}
                  />
                </Suspense>
              ) : (
                <ActivityFollowEmpty feed={feed} url={url} userLogin={userLogin} />
              )}
            </TabsContent>
          </Tabs>
        </DrawerContent>
      </Drawer>

      <Drawer open={contextOpen} onOpenChange={handleContextOpenChange} swipeDirection="right">
        <DrawerContent className={INSPECTOR_DRAWER_CLASS}>
          {contextOpen ? (
            <Suspense fallback={null}>
              <ActivityContextNested url={url} userLogin={userLogin} />
            </Suspense>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  )
}
