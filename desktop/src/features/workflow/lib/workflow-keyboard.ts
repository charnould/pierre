import { useEffect } from 'react'

import type { WorkflowStep } from '@/shared/lib/navigation-model'
import { isTypingInField } from '@/shared/lib/typing-target'

/**
 * Whether Escape should navigate to the agent hub vs. only cancel an in-flight generation.
 * During output/streaming we stay on the workflow panel.
 */
export function shouldEscapeNavigateHome(step: WorkflowStep, isStreaming: boolean): boolean {
  if (step === 'output' || isStreaming) return false
  return true
}

export type WorkflowKeyboardOptions = {
  hidden: boolean
  step: WorkflowStep
  isStreaming: boolean
  canSubmit: boolean
  /** Allow Cmd/Ctrl+Enter to submit while step === 'output' (e.g. tickets context column). */
  allowSubmitInOutput?: boolean
  onSubmit: () => void
  onEscapeHome: () => void
  onCancelStream: () => void
  /** Single-key shortcuts when not focused in an input (e.g. format hotkeys). */
  keyActions?: Record<string, () => void>
}

export function useWorkflowKeyboard({
  hidden,
  step,
  isStreaming,
  canSubmit,
  allowSubmitInOutput = false,
  onSubmit,
  onEscapeHome,
  onCancelStream,
  keyActions
}: WorkflowKeyboardOptions) {
  useEffect(() => {
    if (hidden) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (shouldEscapeNavigateHome(step, isStreaming)) {
          onEscapeHome()
        } else {
          onCancelStream()
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        const canSubmitNow =
          canSubmit && (step === 'form' || (allowSubmitInOutput && step === 'output'))
        if (canSubmitNow) onSubmit()
        return
      }

      if (isTypingInField(e.target)) return

      const action = keyActions?.[e.key]
      if (action && step === 'form') {
        e.preventDefault()
        action()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    hidden,
    step,
    isStreaming,
    canSubmit,
    allowSubmitInOutput,
    onSubmit,
    onEscapeHome,
    onCancelStream,
    keyActions
  ])
}
