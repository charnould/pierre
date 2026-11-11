import { Activity, Inbox, XIcon } from 'lucide-react'
import type { MouseEvent, RefObject } from 'react'
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { ActivityNotificationRow } from '@/features/activity/components/ActivityNotificationRow'
import {
  ActivityFollowList,
  ActivityScopeControls,
  followedPeopleCount,
  selectAuthoredActivityItems
} from '@/features/activity/components/ActivityScopeControls'
import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import { type ActivityRailTab, useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { InspectorSplit } from '@/shared/components/inspector/inspector-split'
import { InspectorTimelineSkeleton } from '@/shared/components/inspector/inspector-timeline-skeleton'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

const ActivityInspectorContent = lazy(() =>
  import('@/features/activity/components/ActivityInspectorContent').then((module) => ({
    default: module.ActivityInspectorContent
  }))
)
const ActivityTimelineList = lazy(() =>
  import('@/features/activity/components/ActivityTimelineList').then((module) => ({
    default: module.ActivityTimelineList
  }))
)

const EMPTY_ROUTINE_NAMES: Record<string, string> = {}

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
        <div className="flex min-h-0 flex-1 px-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>{emptyCopy.title}</EmptyTitle>
              <EmptyDescription>{emptyCopy.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col">
          <ul className="flex min-w-0 flex-col gap-2 px-6 pb-4">
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
    <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-6 pb-4">
      <FieldSet>
        <FieldLegend>Qui suivre</FieldLegend>
        <FieldDescription>Leurs actions apparaissent ici.</FieldDescription>
        <ActivityFollowList feed={feed} url={url} userLogin={userLogin} />
      </FieldSet>
    </div>
  )
}

export function ActivityPanel({ feed, url, userLogin }: Props) {
  const showReadId = useId()
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
  const {
    open,
    setOpen,
    railTab,
    setRailTab,
    tasksOpen,
    contextTarget,
    closeContextTarget,
    openContextTarget,
    openReader
  } = useActivityRail()
  const contextOpen = contextTarget != null
  const [routineNames, setRoutineNames] = useState<Record<string, string>>({})
  const listsOpen = open || contextOpen
  const routineIdsKey = useMemo(() => {
    if (!listsOpen) return ''
    return items
      .flatMap((item) => (item.target?.view === 'automations' ? [item.target.automationId] : []))
      .sort()
      .join('\n')
  }, [items, listsOpen])
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

  const handleCloseButton = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      closePanel()
    },
    [closePanel]
  )

  const notificationItems = useMemo(() => {
    if (!open) return []
    return sortNotifications(
      items.filter((item) => {
        if (item.source === 'activity') return false
        return showRead || !item.isRead
      })
    )
  }, [items, open, showRead])

  const activityItems = useMemo(() => {
    if (!open) return []
    return selectAuthoredActivityItems(items, userLogin, {
      followedActivityAuthors: feed.followedActivityAuthors,
      showOwnActivity: feed.showOwnActivity
    })
  }, [feed.followedActivityAuthors, feed.showOwnActivity, items, open, userLogin])

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
      if (item.target.view === 'updates') {
        setOpen(false)
        closeContextTarget()
        openReader({
          kind: 'update',
          slug: item.target.slug,
          title: item.target.title,
          date: item.target.date
        })
        if (!item.isRead) void markItemRead(item.id)
        return
      }
      if (item.target.view !== 'tickets' && item.target.view !== 'repayment') {
        return
      }

      openContextTarget(item.target)
      if (!item.isRead) void markItemRead(item.id)
    },
    [closeContextTarget, markItemRead, openContextTarget, openReader, setOpen]
  )

  const handleMarkUnread = useCallback(
    (item: ActivityNotificationItem) => {
      void markUnread(item.id)
    },
    [markUnread]
  )

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen} swipeDirection="left">
        <DrawerContent variant="activity">
          <Tabs
            value={railTab}
            onValueChange={(value) => setRailTab(value as ActivityRailTab)}
            className="min-h-0 min-w-0 flex-1 gap-0"
          >
            <DrawerHeader onPointerDown={(event) => event.stopPropagation()}>
              <DrawerTitle className="sr-only">Notifications et activités</DrawerTitle>
              <TabsList aria-label="Notifications et activités" className="flex-1">
                <TabsTrigger value="notifications">
                  <Inbox />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="activities">
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
            {railTab === 'notifications' || (railTab === 'activities' && hasFollowedAnyone) ? (
              <div
                className="no-drag flex shrink-0 items-center gap-1 px-6 pb-4"
                onPointerDown={(event) => event.stopPropagation()}
              >
                {railTab === 'notifications' ? (
                  <>
                    <Field orientation="horizontal" className="w-fit">
                      <Checkbox
                        id={showReadId}
                        checked={showRead}
                        onCheckedChange={(checked) => setShowRead(checked === true)}
                      />
                      <FieldLabel htmlFor={showReadId}>Afficher les notifications lues</FieldLabel>
                    </Field>
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

            <TabsContent value="notifications" className="flex min-h-0 flex-col overflow-hidden">
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
                loadMoreEnabled={open && railTab === 'notifications'}
              />
            </TabsContent>
            <TabsContent value="activities" className="flex min-h-0 flex-col overflow-hidden">
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
                    loadMoreEnabled={open && railTab === 'activities'}
                  />
                </Suspense>
              ) : (
                <ActivityFollowEmpty feed={feed} url={url} userLogin={userLogin} />
              )}
            </TabsContent>
          </Tabs>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={contextOpen}
        onOpenChange={handleContextOpenChange}
        modal={!open && !tasksOpen}
        swipeDirection="right"
      >
        <DrawerContent variant="inspector">
          {contextOpen ? (
            <Suspense
              fallback={
                <InspectorSplit
                  left={
                    <InspectorTimelineSkeleton
                      variant={contextTarget?.view === 'repayment' ? 'repayment' : 'ticket'}
                      pane="present"
                    />
                  }
                  right={
                    <InspectorTimelineSkeleton
                      variant={contextTarget?.view === 'repayment' ? 'repayment' : 'ticket'}
                      pane="history"
                    />
                  }
                />
              }
            >
              <ActivityInspectorContent url={url} userLogin={userLogin} />
            </Suspense>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  )
}
