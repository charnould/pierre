import { useCallback, useEffect, useRef } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { AutomationsSettings } from '@/shared/lib/ui-settings/schema'

type Options = {
  delayMs: number
}

/**
 * Debounces automations UI settings patches (e.g. panel split ratio).
 */
export function useDebouncedAutomationsPatch({ delayMs }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<AutomationsSettings>>({})
  const { patchAutomations } = useUiSettings()

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
    await patchAutomations(merged)
  }, [patchAutomations])

  const patch = useCallback(
    (partial: Partial<AutomationsSettings>) => {
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
        void patchAutomations(merged)
      }
    }
  }, [patchAutomations])

  return { patch, cancel }
}
