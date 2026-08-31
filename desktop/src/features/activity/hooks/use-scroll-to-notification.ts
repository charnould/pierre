import { useLayoutEffect, useRef, type Ref } from 'react'

/** Dernier essai après la transition d’ouverture du Drawer (280 ms). */
const RETRY_DELAYS_MS = [0, 100, 320] as const

function scrollToNotification(container: HTMLElement, notificationId: string | number): boolean {
  const target = container.querySelector(`[data-activity-id="${notificationId}"]`)
  if (!(target instanceof HTMLElement)) return false
  target.scrollIntoView({ block: 'center' })
  return true
}

/** Scroll vers une notification ciblée quand la timeline s’ouvre. */
export function useScrollToNotification(
  open: boolean,
  resetKey: string | null | undefined,
  highlightId: string | number | undefined
): Ref<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || resetKey == null || !highlightId) return

    const attemptScroll = () => {
      const el = ref.current
      if (!el) return
      scrollToNotification(el, highlightId)
    }

    attemptScroll()
    const raf = requestAnimationFrame(attemptScroll)
    const timers = RETRY_DELAYS_MS.map((delay) => window.setTimeout(attemptScroll, delay))

    return () => {
      cancelAnimationFrame(raf)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [highlightId, open, resetKey])

  return ref
}
