import { Inbox } from 'lucide-react'
import { type CSSProperties, useEffect, useRef } from 'react'

import { useResolvedUiSettings } from '@/contexts/UiSettingsContext'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { prefersReducedMotion } from '@/shared/lib/prefers-reduced-motion'
import { resolveMascotSettings } from '@/shared/lib/ui-settings/schema'

interface Props {
  unreadCount: number
}

/** Burst fini — signale une arrivée sans maintenir la navigation en mouvement. */
const RING_KEYFRAMES = [
  { transform: 'rotate(0deg) scale(1)' },
  { transform: 'rotate(-20deg) scale(1.08)' },
  { transform: 'rotate(18deg) scale(1.03)' },
  { transform: 'rotate(-12deg) scale(1.06)' },
  { transform: 'rotate(8deg) scale(1.02)' },
  { transform: 'rotate(-4deg) scale(1.01)' },
  { transform: 'rotate(0deg) scale(1)' }
] satisfies Keyframe[]

const RING_TIMING = {
  duration: 300,
  easing: 'cubic-bezier(0.77, 0, 0.175, 1)'
} satisfies KeyframeAnimationOptions

export function ActivityNotificationsTrigger({ unreadCount }: Props) {
  const { open, setOpen, openRail } = useActivityRail()
  const ringRef = useRef<HTMLSpanElement>(null)
  const ringAnimationRef = useRef<Animation | null>(null)
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
    if (unreadCount <= previous || prefersReducedMotion()) return

    ringAnimationRef.current?.cancel()
    ringAnimationRef.current = ringRef.current?.animate(RING_KEYFRAMES, RING_TIMING) ?? null
  }, [unreadCount])

  useEffect(
    () => () => {
      ringAnimationRef.current?.cancel()
    },
    []
  )

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
        <span
          ref={ringRef}
          aria-hidden
          className="relative flex size-4 shrink-0 origin-[50%_10%] items-center justify-center"
        >
          <Inbox />
          {hasUnread ? (
            <span
              data-unread-dot=""
              className="pointer-events-none absolute start-full top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-(--mascot-badge)"
              style={{ '--mascot-badge': badgeColor } as CSSProperties}
            />
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">Notifications</TooltipContent>
    </Tooltip>
  )
}
