import { useCallback, useRef, type UIEvent } from 'react'

export function useSyncedHorizontalScroll() {
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const syncingScrollRef = useRef(false)

  const syncScrollLeft = useCallback((source: 'header' | 'body', scrollLeft: number) => {
    if (syncingScrollRef.current) return
    syncingScrollRef.current = true
    const target = source === 'header' ? bodyScrollRef.current : headerScrollRef.current
    if (target && target.scrollLeft !== scrollLeft) target.scrollLeft = scrollLeft
    syncingScrollRef.current = false
  }, [])

  const onHeaderScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      syncScrollLeft('header', event.currentTarget.scrollLeft)
    },
    [syncScrollLeft]
  )

  const onBodyScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      syncScrollLeft('body', event.currentTarget.scrollLeft)
    },
    [syncScrollLeft]
  )

  return {
    headerScrollRef,
    bodyScrollRef,
    onHeaderScroll,
    onBodyScroll
  }
}
