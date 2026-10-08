import { SquareCheck, UserRound, XIcon } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useCallback } from 'react'

import { type TasksRailTab, useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { activityToTarget } from '@/features/activity/lib/notification-types'
import { HomeActionBuckets } from '@/features/home/HomeActionBuckets'
import { Button } from '@/shared/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { ActionActivity } from '@/shared/lib/activities/action-activity'

interface Props {
  mine: ActionActivity[]
  delegated: ActionActivity[]
  hasMoreMine?: boolean
  hasMoreDelegated?: boolean
  onLoadMoreMine?: () => void
  onLoadMoreDelegated?: () => void
}

export function TasksPanel({
  mine,
  delegated,
  hasMoreMine = false,
  hasMoreDelegated = false,
  onLoadMoreMine,
  onLoadMoreDelegated
}: Props) {
  const { tasksOpen, setTasksOpen, tasksTab, setTasksTab, openContextTarget } = useActivityRail()

  const closePanel = useCallback(() => {
    setTasksOpen(false)
  }, [setTasksOpen])

  const handleCloseButton = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      closePanel()
    },
    [closePanel]
  )

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

  return (
    <Drawer open={tasksOpen} onOpenChange={setTasksOpen} swipeDirection="left">
      <DrawerContent variant="activity">
        <Tabs
          value={tasksTab}
          onValueChange={(value) => setTasksTab(value as TasksRailTab)}
          className="min-h-0 min-w-0 flex-1 gap-0"
        >
          <DrawerHeader onPointerDown={(event) => event.stopPropagation()}>
            <DrawerTitle className="sr-only">Tâches</DrawerTitle>
            <TabsList aria-label="Mes tâches et tâches assignées" className="flex-1">
              <TabsTrigger value="mine">
                <SquareCheck />
                Mes tâches
              </TabsTrigger>
              <TabsTrigger value="delegated">
                <UserRound />
                Tâches assignées
              </TabsTrigger>
            </TabsList>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ms-auto"
              aria-label="Fermer les tâches"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleCloseButton}
            >
              <XIcon aria-hidden />
            </Button>
          </DrawerHeader>
          <TabsContent value="mine" className="flex min-h-0 flex-col overflow-hidden">
            <HomeActionBuckets
              actions={mine}
              emptyTitle="Aucune tâche"
              emptyDescription="Rien d’ouvert."
              emptyIcon={<SquareCheck />}
              onOpen={openAction}
              onLoadMore={onLoadMoreMine}
              hasMore={hasMoreMine}
              loadMoreEnabled={tasksOpen && tasksTab === 'mine'}
            />
          </TabsContent>
          <TabsContent value="delegated" className="flex min-h-0 flex-col overflow-hidden">
            <HomeActionBuckets
              actions={delegated}
              emptyTitle="Aucune tâche assignée"
              emptyDescription="Rien de délégué."
              emptyIcon={<UserRound />}
              onOpen={openAction}
              onLoadMore={onLoadMoreDelegated}
              hasMore={hasMoreDelegated}
              loadMoreEnabled={tasksOpen && tasksTab === 'delegated'}
            />
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}
