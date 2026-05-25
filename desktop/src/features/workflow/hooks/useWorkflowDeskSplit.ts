import { useCallback, useEffect, useRef } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { useDebouncedWorkflowPatch } from '@/shared/hooks/useDebouncedWorkflowPatch'
import {
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE,
  defaultWorkflowPanelLayout,
  resolveWorkflowOutputSplit,
  splitFromLayout,
  type WorkflowOutputSplitKey
} from '@/shared/lib/ui-settings/schema'

type Options = {
  splitKey: WorkflowOutputSplitKey
  hidden: boolean
  panelActive: boolean
  delayMs?: number
}

/**
 * Persists workflow desk split layout (tickets output, about synthèse, …).
 */
export function useWorkflowDeskSplit({ splitKey, hidden, panelActive, delayMs = 400 }: Options) {
  const { settings: uiSettings, loading: uiLoading } = useUiSettings()
  const { patch: patchWorkflow, cancel: cancelWorkflowPatch } = useDebouncedWorkflowPatch({
    delayMs
  })

  const outputSplit = resolveWorkflowOutputSplit(uiSettings.workflow, splitKey)
  const savedSplitRef = useRef(outputSplit)

  useEffect(() => {
    savedSplitRef.current = resolveWorkflowOutputSplit(uiSettings.workflow, splitKey)
  }, [uiSettings.workflow, splitKey])

  useEffect(() => {
    if (uiLoading) cancelWorkflowPatch()
  }, [uiLoading, cancelWorkflowPatch])

  const panelGroupKey = `${splitKey}-${outputSplit.contextePercent ?? WORKFLOW_SPLIT_DEFAULT_CONTEXTE}`
  const defaultLayout = defaultWorkflowPanelLayout(outputSplit)
  const panelReady = !uiLoading && !hidden && panelActive

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      if (!panelReady) return
      const nextSplit = splitFromLayout(layout)
      if (savedSplitRef.current?.contextePercent === nextSplit.contextePercent) return
      savedSplitRef.current = nextSplit
      patchWorkflow({ [splitKey]: nextSplit })
    },
    [panelReady, patchWorkflow, splitKey]
  )

  return {
    panelReady,
    panelGroupKey,
    defaultLayout,
    handleLayoutChanged
  }
}
