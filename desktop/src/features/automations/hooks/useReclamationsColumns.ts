import { useCallback, useState } from 'react'

import type { TicketsColumnMeta } from '@/shared/types'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; columns: TicketsColumnMeta[] }
  | { status: 'unavailable' }

/**
 * Loads current `reclamations` columns via GET /desktop/tickets (meta.columns).
 * Re-call `reload` before preview or when the form opens.
 */
export function useReclamationsColumns(url: string | undefined) {
  const [state, setState] = useState<State>({ status: 'idle' })

  const reload = useCallback(async () => {
    if (!url || !window.api?.getTickets) {
      setState({ status: 'unavailable' })
      return
    }
    setState({ status: 'loading' })
    try {
      const res = await window.api.getTickets({ url, limit: 1, offset: 0 })
      const columns = res?.meta?.columns
      if (!columns || columns.length === 0) {
        setState({ status: 'unavailable' })
        return
      }
      setState({ status: 'ready', columns })
    } catch {
      setState({ status: 'unavailable' })
    }
  }, [url])

  return { state, reload }
}
