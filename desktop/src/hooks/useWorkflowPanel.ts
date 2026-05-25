import { useCallback, useRef, useState } from 'react'

import type { Tab } from '../lib/tabs'
import { useWorkflowExport } from '../workflows/useWorkflowExport'
import { useWorkflowGeneration } from '../workflows/useWorkflowGeneration'
import { reasoningUiForSkill, useSkillConfigs } from './useSkillConfigs'

export type WorkflowStep = 'form' | 'output'

export type UseWorkflowPanelOptions = {
  url: string | undefined
  activeSkillId: string
  onNavigate: (tab: Tab) => void
  resetForm: () => void
}

/**
 * Shared form/output step machine for Answer and Synthèse workflow panels.
 */
export function useWorkflowPanel({
  url,
  activeSkillId,
  onNavigate,
  resetForm
}: UseWorkflowPanelOptions) {
  const [step, setStep] = useState<WorkflowStep>('form')
  const feedRef = useRef<HTMLDivElement>(null)

  const skillConfigs = useSkillConfigs(url)
  const reasoningUi = reasoningUiForSkill(skillConfigs, activeSkillId)

  const { state, convId, generate, cancel, clearOutput, resetConvId, patchState } =
    useWorkflowGeneration({
      onErrorReturnToForm: () => setStep('form')
    })

  const { copyText, downloadDocx } = useWorkflowExport(url)

  const resetWorkflow = useCallback(() => {
    cancel()
    resetConvId()
    setStep('form')
    resetForm()
    clearOutput()
  }, [cancel, resetConvId, resetForm, clearOutput])

  const goHome = useCallback(() => {
    resetWorkflow()
    onNavigate('home')
  }, [resetWorkflow, onNavigate])

  const beginOutput = useCallback(() => {
    setStep('output')
    feedRef.current?.scrollTo({ top: 0 })
  }, [])

  return {
    step,
    setStep,
    feedRef,
    state,
    convId,
    generate,
    cancel,
    clearOutput,
    resetConvId,
    patchState,
    copyText,
    downloadDocx,
    reasoningUi,
    skillConfigs,
    isOutput: step === 'output',
    resetWorkflow,
    goHome,
    beginOutput
  }
}
