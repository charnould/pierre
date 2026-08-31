import { Bell, BellRing } from 'lucide-react'
import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useRef } from 'react'

import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { UpdatesUnreadIndicator } from '@/features/updates/components/UpdatesUnreadIndicator'
import { SidebarMenuButton, SidebarMenuItem } from '@/shared/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'

/** Évite la fermeture immédiate du sheet quand on bascule depuis la sidebar. */
export const activityNotificationsDismissGuard = { current: false }

interface Props {
  unreadCount: number
  disabled?: boolean
}

/** Burst fini — signale une arrivée sans maintenir la navigation en mouvement. */
const RING_ROTATE = [0, -20, 18, -12, 8, -4, 0] as const
const RING_SCALE = [1, 1.08, 1.03, 1.06, 1.02, 1.01, 1] as const
const RING_EASE = [0.77, 0, 0.175, 1] as const

export function ActivityNotificationsTrigger({ unreadCount, disabled = false }: Props) {
  const { open, setOpen } = useActivityRail()
  const ringControls = useAnimationControls()
  const previousUnreadCount = useRef(unreadCount)
  const hasUnread = unreadCount > 0
  const Icon = hasUnread ? BellRing : Bell

  useEffect(() => {
    const previous = previousUnreadCount.current
    previousUnreadCount.current = unreadCount
    if (unreadCount <= previous) return

    void ringControls.start({
      rotate: [...RING_ROTATE],
      scale: [...RING_SCALE],
      transition: { duration: 0.46, ease: RING_EASE }
    })
  }, [ringControls, unreadCount])

  return (
    <SidebarMenuItem className="group">
      <SidebarMenuButton
        isActive={open}
        tooltip="Notifications"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          activityNotificationsDismissGuard.current = true
          setOpen(!open)
          window.setTimeout(() => {
            activityNotificationsDismissGuard.current = false
          }, 0)
        }}
      >
        <motion.span
          aria-hidden
          className="flex size-4 shrink-0 items-center justify-center will-change-transform"
          style={{ originX: 0.5, originY: 0.1 }}
          initial={false}
          animate={ringControls}
        >
          <Icon strokeWidth={hasUnread ? 2.85 : 2} className="size-4" />
        </motion.span>
        <span className={cn(hasUnread && 'font-semibold')}>Notifications</span>
      </SidebarMenuButton>
      <UpdatesUnreadIndicator count={unreadCount} />
    </SidebarMenuItem>
  )
}
