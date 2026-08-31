import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Activite, ActivityContext } from '@/shared/types/activites'

type TimelineState = {
  key: string | null
  rows: Activite[]
  status: 'idle' | 'loading' | 'refreshing' | 'ready'
}

export function useNotificationTimeline(
  url: string | undefined,
  type: ActivityContext | undefined,
  ref: string | undefined,
  enabled = true
) {
  const requestKey = useMemo(
    () => (enabled && url && type && ref ? JSON.stringify([url, type, ref]) : null),
    [enabled, ref, type, url]
  )
  const [state, setState] = useState<TimelineState>({
    key: null,
    rows: [],
    status: 'idle'
  })
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current

    if (!requestKey || !url || !type || !ref || !window.api?.getActivities) {
      setState({ key: null, rows: [], status: 'idle' })
      return
    }

    setState((current) =>
      current.key === requestKey && current.status === 'ready'
        ? { ...current, status: 'refreshing' }
        : { key: requestKey, rows: [], status: 'loading' }
    )

    try {
      const res = await window.api.getActivities({ url, contexte: type, ref })
      if (requestId !== requestIdRef.current) return
      setState((current) => ({
        key: requestKey,
        rows: res?.data ?? (current.key === requestKey ? current.rows : []),
        status: 'ready'
      }))
    } finally {
      if (requestId === requestIdRef.current) {
        setState((current) =>
          current.key === requestKey && current.status !== 'ready'
            ? { ...current, status: 'ready' }
            : current
        )
      }
    }
  }, [ref, requestKey, type, url])

  useEffect(() => {
    if (!requestKey || !url || !type || !ref || !window.api?.getActivities) return
    const requestId = ++requestIdRef.current
    const capturedKey = requestKey
    void window.api.getActivities({ url, contexte: type, ref }).then((res) => {
      if (requestId !== requestIdRef.current) return
      setState({
        key: capturedKey,
        rows: res?.data ?? [],
        status: 'ready'
      })
    })
  }, [ref, requestKey, type, url])

  const isCurrent = state.key === requestKey
  const initialLoading = requestKey != null && (!isCurrent || state.status === 'loading')
  const refreshing = isCurrent && state.status === 'refreshing'

  return {
    rows: isCurrent ? state.rows : [],
    loading: initialLoading || refreshing,
    initialLoading,
    refreshing,
    refresh
  }
}
