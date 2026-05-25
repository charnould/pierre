import { useCallback, useEffect, useRef } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { UpdatesSettings } from '@/shared/lib/ui-settings/schema'

type Options = {
  delayMs: number
}

/**
 * Debounces updates UI settings patches (e.g. panel split ratio).
 */
export function useDebouncedUpdatesPatch({ delayMs }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<UpdatesSettings>>({})
  const { patchUpdates } = useUiSettings()

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    pending.current = {}
  }, [])

  const flush = useCallback(async () => {
    const merged = pending.current
    pending.current = {}
    if (Object.keys(merged).length === 0) return
    await patchUpdates(merged)
  }, [patchUpdates])

  const patch = useCallback(
    (partial: Partial<UpdatesSettings>) => {
      pending.current = { ...pending.current, ...partial }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        void flush()
      }, delayMs)
    },
    [delayMs, flush]
  )

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      const merged = pending.current
      pending.current = {}
      if (Object.keys(merged).length > 0) {
        void patchUpdates(merged)
      }
    }
  }, [patchUpdates])

  return { patch, cancel }
}
