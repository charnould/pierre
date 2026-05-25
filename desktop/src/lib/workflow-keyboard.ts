import { useEffect } from 'react'

/**
 * Whether Escape should navigate to the agent hub vs. only cancel an in-flight generation.
 * During output/streaming we stay on the workflow panel.
 */
export function shouldEscapeNavigateHome(step: 'form' | 'output', isStreaming: boolean): boolean {
  if (step === 'output' || isStreaming) return false
  return true
}

export function isTypingInField(target: EventTarget | null): boolean {
  const el = target as HTMLTextAreaElement | HTMLInputElement | null
  if (!el || !['TEXTAREA', 'INPUT'].includes(el.tagName)) return false
  return !(el as HTMLTextAreaElement).readOnly
}

export type WorkflowKeyboardOptions = {
  hidden: boolean
  step: 'form' | 'output'
  isStreaming: boolean
  canSubmit: boolean
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
        if (step === 'form' && canSubmit) onSubmit()
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
  }, [hidden, step, isStreaming, canSubmit, onSubmit, onEscapeHome, onCancelStream, keyActions])
}
