import { useCallback } from 'react'

import { NotificationTimeline } from '@/features/activity/components/NotificationTimeline'
import { useNotificationTimeline } from '@/features/activity/hooks/use-notification-timeline'
import { useScrollToNotification } from '@/features/activity/hooks/use-scroll-to-notification'
import { ticketContextLabel } from '@/features/activity/lib/notification-labels'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/shared/components/ui/drawer'

interface TicketsActivityDrawerProps {
  url: string | undefined
  target: { id_reclamation: string; activityId?: number } | null
  sheetOpenToken: number
  onClose: () => void
}

export function TicketsActivityDrawer({
  url,
  target,
  sheetOpenToken,
  onClose
}: TicketsActivityDrawerProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) onClose()
    },
    [onClose]
  )
  const { rows, loading } = useNotificationTimeline(
    url,
    target ? 'tickets' : undefined,
    target?.id_reclamation,
    target != null
  )
  const scrollRef = useScrollToNotification(
    target != null,
    target != null ? `${target.id_reclamation}:${sheetOpenToken}` : null,
    target?.activityId
  )

  return (
    <Drawer open={target != null} onOpenChange={handleOpenChange} swipeDirection="right">
      <DrawerContent>
        {target ? (
          <>
            <DrawerHeader>
              <DrawerTitle
                className="min-w-0 text-sm leading-5 font-medium break-words tabular-nums"
                title={ticketContextLabel(target.id_reclamation)}
              >
                {ticketContextLabel(target.id_reclamation)}
              </DrawerTitle>
              <DrawerDescription>Réclamations · mentions</DrawerDescription>
            </DrawerHeader>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              <NotificationTimeline rows={rows} loading={loading} highlightId={target.activityId} />
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
