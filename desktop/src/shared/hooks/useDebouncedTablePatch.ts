import { useCallback, useEffect, useRef } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { mergeTicketsTablePatches } from '@/shared/lib/ui-settings/merge-table-patches'
import type { TicketsTableSettings } from '@/shared/lib/ui-settings/schema'

type Options = {
  delayMs: number
  /** Called when local edits start (suppresses external settings sync). */
  onDirty?: () => void
  /** Called after a merged patch has been persisted. */
  onPersisted?: () => void
}

/**
 * Debounces tickets-table patches and merges partial updates within the debounce window.
 */
export function useDebouncedTablePatch({ delayMs, onDirty, onPersisted }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<TicketsTableSettings>>({})
  const { patchTicketsTable } = useUiSettings()

  const flush = useCallback(async () => {
    const merged = pending.current
    pending.current = {}
    if (Object.keys(merged).length === 0) return
    await patchTicketsTable(merged)
    onPersisted?.()
  }, [onPersisted, patchTicketsTable])

  const patch = useCallback(
    (partial: Partial<TicketsTableSettings>) => {
      onDirty?.()
      pending.current = mergeTicketsTablePatches(pending.current, partial)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        void flush()
      }, delayMs)
    },
    [delayMs, flush, onDirty]
  )

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      pending.current = {}
    }
  }, [])

  return patch
}
