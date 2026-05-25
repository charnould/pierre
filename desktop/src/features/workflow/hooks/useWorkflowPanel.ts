import { useCallback, useRef, useState } from 'react'

import { reasoningUiForSkill, useSkillConfigs } from '@/shared/hooks/useSkillConfigs'
import type { Tab } from '@/shared/lib/tabs'

import { useWorkflowExport } from './useWorkflowExport'
import { useWorkflowGeneration } from './useWorkflowGeneration'

export type WorkflowStep = 'form' | 'output'

export type UseWorkflowPanelOptions = {
  url: string | undefined
  id_skill: string
  onNavigate: (tab: Tab) => void
  resetForm: () => void
  /** When null, generation errors keep the current step (e.g. tickets output). */
  onErrorReturnToForm?: (() => void) | null
}

/**
 * Shared form/output step machine for Answer and Synthèse workflow panels.
 */
export function useWorkflowPanel({
  url,
  id_skill,
  onNavigate,
  resetForm,
  onErrorReturnToForm
}: UseWorkflowPanelOptions) {
  const [step, setStep] = useState<WorkflowStep>('form')
  const feedRef = useRef<HTMLDivElement>(null)

  const skillConfigs = useSkillConfigs(url)
  const reasoningUi = reasoningUiForSkill(skillConfigs, id_skill)

  const { state, convId, generate, cancel, clearOutput, resetConvId, patchState } =
    useWorkflowGeneration({
      url,
      ...(onErrorReturnToForm !== null
        ? { onErrorReturnToForm: onErrorReturnToForm ?? (() => setStep('form')) }
        : {})
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
    onNavigate('home')
    resetWorkflow()
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
