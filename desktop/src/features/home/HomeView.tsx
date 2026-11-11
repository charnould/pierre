import { Activity, Inbox, ListTodo, type LucideIcon, SquareCheck, UserRound } from 'lucide-react'
import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useResolvedUiSettings } from '@/contexts/UiSettingsContext'
import { ActivityNotificationRow } from '@/features/activity/components/ActivityNotificationRow'
import { selectAuthoredActivityItems } from '@/features/activity/components/ActivityScopeControls'
import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { activityToTarget } from '@/features/activity/lib/notification-types'
import { HomeActionBuckets } from '@/features/home/HomeActionBuckets'
import { HomeDoor, type HomeDoorId } from '@/features/home/HomeDoor'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptyDescription } from '@/shared/components/ui/empty'
import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import { isPanelTabVisible, moduleIdForTab } from '@/shared/lib/tab-registry'
import type { Tab } from '@/shared/lib/tabs'
import { resolveHomeSettings } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'
import type { UserPrincipal } from '@/shared/types/users'

const ActivityTimelineList = lazy(() =>
  import('@/features/activity/components/ActivityTimelineList').then((module) => ({
    default: module.ActivityTimelineList
  }))
)

const HOME_TILES = [
  'chat',
  'tickets',
  'repayment',
  'automations',
  'bulk',
  'about',
  'insurance',
  'relocation',
  'attributions',
  'ventes'
] as const satisfies readonly HomeDoorId[]

const HOME_GREETINGS = [
  'Bonjour,',
  'Ravi de vous voir,',
  'Content de vous revoir,',
  'Ravi de vous retrouver,',
  'Prêt à vous aider,',
  'À votre service,',
  'Hello,'
] as const

export function homeGreetings(agentName: string, preferredName: string | null = null): string[] {
  return [
    ...HOME_GREETINGS,
    `${agentName} est prêt à vous aider,`,
    `${agentName}, à votre service,`,
    `C’est ${agentName},`,
    `Ici ${agentName},`,
    ...(preferredName
      ? [
          `Bonjour ${preferredName},`,
          `Ravi de vous revoir, ${preferredName}.`,
          `À votre service, ${preferredName}.`
        ]
      : [])
  ]
}

const HOME_MOMENTS = [
  'aujourd’hui',
  'à présent',
  'maintenant',
  'à cet instant',
  'en ce moment'
] as const

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

const HOME_BOARD = 'mx-auto flex w-full max-w-7xl flex-col gap-6'
const HOME_GRID = 'grid grid-cols-4 items-start gap-4'
const HOME_RATIO = 'aspect-[1.618]'

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

function HomeStatus({ description }: { description: string }) {
  return <EmptyDescription size="sm">{description}</EmptyDescription>
}

function HomeSection({
  title,
  icon: Icon,
  empty,
  onSeeAll,
  seeAllLabel,
  children
}: {
  title: string
  icon: LucideIcon
  empty: boolean
  onSeeAll: () => void
  seeAllLabel: string
  children: ReactNode
}) {
  return (
    <Card className={cn('min-w-0 gap-1 px-4 py-3', empty && HOME_RATIO)}>
      <div className="flex items-start justify-between gap-2">
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={seeAllLabel}
          onClick={onSeeAll}
        >
          Tout voir
        </Button>
      </div>
      <CardHeader className="px-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
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
  const { openRail, openTasksRail, openContextTarget, openReader, contextTarget, tasksOpen } =
    useActivityRail()
  const greetingIdentity = useRef({ agentName, preferredName: user.preferredName })
  const [invite, setInvite] = useState(() => ({
    greeting: pickOne(homeGreetings(agentName, user.preferredName)),
    moment: pickOne(HOME_MOMENTS)
  }))
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
  const visibleTiles = HOME_TILES.filter((entry) => {
    if (entry === 'chat') return true
    if (!isPanelTabVisible(entry)) return false
    const moduleId = moduleIdForTab(entry)
    return moduleId === null || user.moduleIds.includes(moduleId)
  })

  useEffect(() => {
    const previous = greetingIdentity.current
    if (previous.agentName === agentName && previous.preferredName === user.preferredName) return
    greetingIdentity.current = { agentName, preferredName: user.preferredName }
    setInvite({
      greeting: pickOne(homeGreetings(agentName, user.preferredName)),
      moment: pickOne(HOME_MOMENTS)
    })
  }, [agentName, user.preferredName])

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
      if (!item.target) {
        return
      }
      if (item.target.view === 'updates') {
        openReader({
          kind: 'update',
          slug: item.target.slug,
          title: item.target.title,
          date: item.target.date
        })
        if (!item.isRead) void feed.markItemRead(item.id)
        return
      }
      if (item.target.view !== 'tickets' && item.target.view !== 'repayment') return
      openContextTarget(item.target)
      if (!item.isRead) void feed.markItemRead(item.id)
    },
    [feed, openContextTarget, openReader]
  )

  if (hidden) {
    return (
      <div
        data-tab-panel
        data-hidden=""
        aria-label="Accueil"
        className="bg-background absolute inset-0 hidden"
      />
    )
  }

  return (
    <div
      data-tab-panel
      data-hidden={hidden || undefined}
      aria-label="Accueil"
      className={cn(
        'bg-background absolute inset-0 min-h-0 flex-col overflow-y-auto p-4',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <div className={HOME_BOARD}>
        <header className="flex flex-col">
          <p className="font-serif text-5xl leading-tight font-medium">{invite.greeting}</p>
          <p className="-mt-2 font-serif text-4xl leading-tight font-medium">
            Que souhaitez-vous faire {invite.moment} ?
          </p>
        </header>
        <div className="flex flex-col gap-4">
          <nav className={HOME_GRID} aria-label="Métiers">
            {visibleTiles.map((entry) => (
              <HomeDoor
                key={entry}
                entry={entry}
                agentName={agentName}
                onOpen={() => onNavigate(entry)}
              />
            ))}
          </nav>

          <section className={HOME_GRID} aria-label="Travail personnel">
            <HomeSection
              title="Notifications"
              icon={Inbox}
              empty={notificationItems.length === 0}
              onSeeAll={() => openRail('notifications')}
              seeAllLabel="Tout voir les notifications"
            >
              {notificationItems.length === 0 ? (
                <HomeStatus description="Vous êtes à jour." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {notificationItems.map((item) => (
                    <ActivityNotificationRow
                      key={`${item.source}:${item.id}`}
                      item={item}
                      onOpen={openNotification}
                      onMarkUnread={(mark) => void feed.markUnread(mark.id)}
                    />
                  ))}
                </ul>
              )}
            </HomeSection>

            <HomeSection
              title="Tâches"
              icon={SquareCheck}
              empty={visibleMine.length === 0}
              onSeeAll={() => openTasksRail('mine')}
              seeAllLabel="Tout voir mes tâches"
            >
              {visibleMine.length === 0 ? (
                <HomeStatus description="Rien d’ouvert." />
              ) : (
                <HomeActionBuckets
                  actions={visibleMine}
                  emptyTitle="Aucune tâche"
                  emptyDescription="Rien d’ouvert."
                  emptyIcon={<ListTodo />}
                  fit
                  onOpen={openAction}
                />
              )}
            </HomeSection>

            <HomeSection
              title="Tâches assignées"
              icon={UserRound}
              empty={visibleDelegated.length === 0}
              onSeeAll={() => openTasksRail('delegated')}
              seeAllLabel="Tout voir les tâches assignées"
            >
              {visibleDelegated.length === 0 ? (
                <HomeStatus description="Rien de délégué." />
              ) : (
                <HomeActionBuckets
                  actions={visibleDelegated}
                  emptyTitle="Aucune tâche assignée"
                  emptyDescription="Rien de délégué."
                  emptyIcon={<UserRound />}
                  fit
                  onOpen={openAction}
                />
              )}
            </HomeSection>

            <HomeSection
              title="Activités"
              icon={Activity}
              empty={activityItems.length === 0}
              onSeeAll={() => openRail('activities')}
              seeAllLabel="Tout voir les activités"
            >
              {activityItems.length === 0 ? (
                <HomeStatus description="Aucune activité récente pour les personnes suivies." />
              ) : (
                <Suspense fallback={null}>
                  <ActivityTimelineList
                    items={activityItems}
                    emptyCopy={{
                      title: 'Aucune activité',
                      description: 'Aucune activité récente pour les personnes suivies.'
                    }}
                    emptyIcon={<Activity />}
                    fit
                    onOpen={openNotification}
                  />
                </Suspense>
              )}
            </HomeSection>
          </section>
        </div>
      </div>
    </div>
  )
}
