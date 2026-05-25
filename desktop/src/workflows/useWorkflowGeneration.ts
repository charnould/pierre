import { useCallback, useRef, useState } from 'react'

import { parseResult, parseStreamingResult } from '../lib/parse-result'
import { cancelAiStream, runAiStream } from '../lib/run-ai-stream'

export type WorkflowGenerateParams = {
  url: string
  conv_id: string
  message?: string
  context?: string
  payload?: string
  skill: string
  files: Array<{ name: string; type: string; buffer: ArrayBuffer }>
  /** Override hook-level default for this run (e.g. from skill config). */
  captureReasoning?: boolean
}

export type WorkflowGenerationState = {
  analysis: string
  response: string
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
  errMsg: string
}

const EMPTY: WorkflowGenerationState = {
  analysis: '',
  response: '',
  reasoning: '',
  isStreaming: false,
  isReasoningPhase: false,
  errMsg: ''
}

type Options = {
  /** When false, reasoning_delta chunks are ignored (e.g. Clearance-style; unused on stub). */
  captureReasoning?: boolean
  onErrorReturnToForm?: () => void
}

/**
 * Shared `/ai/answer` streaming for Answer and Synthèse panels.
 */
export function useWorkflowGeneration(options: Options = {}) {
  const { captureReasoning = true, onErrorReturnToForm } = options
  const isGeneratingRef = useRef(false)
  const convId = useRef(crypto.randomUUID())

  const [state, setState] = useState<WorkflowGenerationState>(EMPTY)

  const resetConvId = useCallback(() => {
    convId.current = crypto.randomUUID()
  }, [])

  const cancel = useCallback(() => {
    cancelAiStream()
    isGeneratingRef.current = false
    setState((s) => ({ ...s, isStreaming: false, isReasoningPhase: false }))
  }, [])

  const clearOutput = useCallback(() => {
    setState((s) => ({
      ...s,
      analysis: '',
      response: '',
      reasoning: '',
      errMsg: ''
    }))
  }, [])

  const generate = useCallback(
    async (params: WorkflowGenerateParams) => {
      if (isGeneratingRef.current) return false
      const { url, captureReasoning: captureReasoningOverride } = params
      if (!url) return false
      const shouldCaptureReasoning = captureReasoningOverride ?? captureReasoning

      isGeneratingRef.current = true
      setState({
        analysis: '',
        response: '',
        reasoning: '',
        isStreaming: true,
        isReasoningPhase: true,
        errMsg: ''
      })

      const streamBuf = { current: '' }

      const { ok, cancelled } = await runAiStream({
        start: () => window.api.generateAnswer(params),
        isCancelled: () => !isGeneratingRef.current,
        onEvent: (event) => {
          if (event.type === 'error') {
            setState((s) => ({ ...s, errMsg: 'Erreur de génération.' }))
            return
          }
          if (event.type === 'reasoning_delta' && shouldCaptureReasoning) {
            setState((s) => ({
              ...s,
              reasoning: s.reasoning + event.content,
              isReasoningPhase: true
            }))
            return
          }
          if (event.type === 'delta') {
            streamBuf.current += event.content
            const parsed = parseStreamingResult(streamBuf.current)
            const hasOutput = !!(parsed.analysis.trim() || parsed.response.trim())
            setState((s) => ({
              ...s,
              analysis: parsed.analysis,
              response: parsed.response,
              ...(hasOutput ? { isReasoningPhase: false } : {})
            }))
          }
        }
      })

      if (cancelled) {
        isGeneratingRef.current = false
        return false
      }

      if (!ok) {
        setState((s) => ({
          ...s,
          errMsg: 'Erreur de génération.',
          isStreaming: false,
          isReasoningPhase: false
        }))
        isGeneratingRef.current = false
        onErrorReturnToForm?.()
        return false
      }

      const finalParsed = parseResult(streamBuf.current)
      setState((s) => ({
        ...s,
        analysis: finalParsed.analysis,
        response: finalParsed.response,
        isStreaming: false,
        isReasoningPhase: false,
        errMsg: ''
      }))
      isGeneratingRef.current = false
      return true
    },
    [captureReasoning, onErrorReturnToForm]
  )

  const patchState = useCallback((patch: Partial<WorkflowGenerationState>) => {
    setState((s) => ({ ...s, ...patch }))
  }, [])

  return {
    state,
    convId,
    generate,
    cancel,
    clearOutput,
    resetConvId,
    patchState
  }
}
