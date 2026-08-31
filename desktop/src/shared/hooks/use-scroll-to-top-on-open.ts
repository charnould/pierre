import { useCallback, useLayoutEffect, useRef } from 'react'

/** Dernier essai après la transition d’ouverture du Drawer (280 ms). */
const RETRY_DELAYS_MS = [0, 100, 320] as const

function scrollElementToTop(el: HTMLElement): void {
  el.scrollTop = 0
}

/** Remonte le scroll quand une sheet détail s’ouvre (après le layout / l’animation stack). */
export function useScrollToTopOnOpen(
  open: boolean,
  resetKey: string | null | undefined
): (node: HTMLDivElement | null) => void {
  const ref = useRef<HTMLDivElement>(null)

  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node
      if (node && open && resetKey != null) {
        scrollElementToTop(node)
      }
    },
    [open, resetKey]
  )

  useLayoutEffect(() => {
    if (!open || resetKey == null) return

    const scrollTop = () => {
      const el = ref.current
      if (el) scrollElementToTop(el)
    }

    scrollTop()
    const raf = requestAnimationFrame(scrollTop)
    const timers = RETRY_DELAYS_MS.map((delay) => window.setTimeout(scrollTop, delay))

    return () => {
      cancelAnimationFrame(raf)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [open, resetKey])

  return scrollRef
}
