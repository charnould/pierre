import { Bell } from 'lucide-react'
import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useRef, type CSSProperties } from 'react'

import { useResolvedUiSettings } from '@/contexts/UiSettingsContext'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { resolveMascotSettings } from '@/shared/lib/ui-settings/schema'

interface Props {
  unreadCount: number
}

/** Burst fini — signale une arrivée sans maintenir la navigation en mouvement. */
const RING_ROTATE = [0, -20, 18, -12, 8, -4, 0] as const
const RING_SCALE = [1, 1.08, 1.03, 1.06, 1.02, 1.01, 1] as const
const RING_EASE = [0.77, 0, 0.175, 1] as const

export function ActivityNotificationsTrigger({ unreadCount }: Props) {
  const { open, setOpen, openRail } = useActivityRail()
  const ringControls = useAnimationControls()
  const previousUnreadCount = useRef(unreadCount)
  const hasUnread = unreadCount > 0
  const badgeColor = resolveMascotSettings(useResolvedUiSettings()).badgeColor
  const ariaLabel =
    unreadCount > 0
      ? `Notifications, ${unreadCount} non-lue${unreadCount > 1 ? 's' : ''}`
      : 'Notifications'

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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="no-drag relative"
            aria-label={ariaLabel}
            aria-pressed={open}
            onClick={() => (open ? setOpen(false) : openRail('notifications'))}
          />
        }
      >
        <motion.span
          aria-hidden
          className="relative flex size-4 shrink-0 origin-[50%_10%] items-center justify-center will-change-transform"
          initial={false}
          animate={ringControls}
        >
          <Bell className="size-4" />
          {hasUnread ? (
            <span
              data-unread-dot=""
              className="pointer-events-none absolute start-full top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-(--mascot-badge)"
              style={{ '--mascot-badge': badgeColor } as CSSProperties}
            />
          ) : null}
        </motion.span>
      </TooltipTrigger>
      <TooltipContent side="bottom">Notifications</TooltipContent>
    </Tooltip>
  )
}
