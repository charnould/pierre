import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import { isScrollPinned, scrollToBottom } from '@/features/workflow/lib/workflow-reasoning-scroll'

type Options = {
  isStreaming: boolean
  reasoning: string
}

export function useWorkflowReasoningScroll({ isStreaming, reasoning }: Options) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const wasStreamingRef = useRef(false)

  const followBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el || !pinnedRef.current) return
    scrollToBottom(el)
  }, [])

  const scheduleFollowBottom = useCallback(() => {
    requestAnimationFrame(followBottom)
  }, [followBottom])

  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      pinnedRef.current = true
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      pinnedRef.current = isScrollPinned(el)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    scheduleFollowBottom()
  }, [reasoning, isStreaming, scheduleFollowBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isStreaming) return

    const mo = new MutationObserver(scheduleFollowBottom)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    scheduleFollowBottom()

    return () => mo.disconnect()
  }, [isStreaming, scheduleFollowBottom])

  return { scrollRef }
}
