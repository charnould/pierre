import { useEffect, useRef } from 'react'

const FIRST_FIELD_SELECTOR =
  'input:not([type=hidden]):not([type=file]), textarea, [role="combobox"], select'

function scheduleFrame(callback: () => void): () => void {
  const raf = globalThis.requestAnimationFrame?.bind(globalThis)
  if (raf) {
    const id = raf(callback)
    return () => globalThis.cancelAnimationFrame?.(id)
  }
  const id = globalThis.setTimeout(callback, 0)
  return () => globalThis.clearTimeout(id)
}

export function useInspectorComposeFocus(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasActive = useRef(false)

  useEffect(() => {
    if (active && !wasActive.current) {
      if (document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement
      }
      const cancel = scheduleFrame(() => {
        containerRef.current?.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR)?.focus()
      })
      wasActive.current = true
      return cancel
    }

    if (!active && wasActive.current) {
      const trigger = triggerRef.current
      const cancel = scheduleFrame(() => trigger?.focus())
      wasActive.current = false
      return cancel
    }
  }, [active])

  return containerRef
}
