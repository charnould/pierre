import { useCallback, useEffect, useRef } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { WorkflowSettings } from '@/shared/lib/ui-settings/schema'

type Options = {
  delayMs: number
}

/**
 * Debounces workflow UI settings patches (e.g. column split ratio).
 */
export function useDebouncedWorkflowPatch({ delayMs }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<WorkflowSettings>>({})
  const { patchWorkflow } = useUiSettings()

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
    await patchWorkflow(merged)
  }, [patchWorkflow])

  const patch = useCallback(
    (partial: Partial<WorkflowSettings>) => {
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
        void patchWorkflow(merged)
      }
    }
  }, [patchWorkflow])

  return { patch, cancel }
}
