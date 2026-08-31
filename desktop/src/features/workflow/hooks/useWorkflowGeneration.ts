import { useCallback, useEffect, useRef, useState } from 'react'

import {
  applyWorkflowStreamEvent,
  createWorkflowStreamSession,
  isWorkflowReasoningPhase
} from '@/features/workflow/lib/workflow-stream-buffers'
import { parseWorkflowStream } from '@/shared/lib/parse-result'
import { createRafThrottle } from '@/shared/lib/raf-throttle'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import { cancelNdjsonStream, runNdjsonStream } from '@/shared/lib/run-ndjson-stream'

export type WorkflowGenerateParams = {
  url: string
  conv_id: string
  payload: string
  id_skill: string
  files: Array<{ name: string; type: string; buffer: ArrayBuffer }>
  /** Override hook-level default for this run (e.g. from skill config). */
  captureReasoning?: boolean
}

export type WorkflowGenerationState = {
  output: string
  subject: string
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
  /** Fixed for the current generation run (avoids skill-config load race). */
  reasoningCapture: boolean
  errMsg: string
}

const EMPTY: WorkflowGenerationState = {
  output: '',
  subject: '',
  reasoning: '',
  isStreaming: false,
  isReasoningPhase: false,
  reasoningCapture: false,
  errMsg: ''
}

type Options = {
  url?: string
  /** When false, structured thinking events are ignored. */
  captureReasoning?: boolean
  onErrorReturnToForm?: () => void
}

/**
 * Shared `/ai/answer` streaming for Answer and Synthèse panels.
 */
export function useWorkflowGeneration(options: Options = {}) {
  const { url, captureReasoning = true, onErrorReturnToForm } = options
  const urlRef = useRef(url)
  const isGeneratingRef = useRef(false)
  const activeRequestIdRef = useRef<string | null>(null)
  const convId = useRef(crypto.randomUUID())

  const [state, setState] = useState<WorkflowGenerationState>(EMPTY)

  useEffect(() => {
    urlRef.current = url
  })

  const releaseCurrentVm = useCallback(() => {
    releaseConversationVm(urlRef.current, convId.current)
  }, [])

  const resetConvId = useCallback(() => {
    releaseCurrentVm()
    convId.current = crypto.randomUUID()
  }, [releaseCurrentVm])

  const cancel = useCallback(() => {
    if (activeRequestIdRef.current) {
      cancelNdjsonStream(activeRequestIdRef.current)
      activeRequestIdRef.current = null
    }
    isGeneratingRef.current = false
    setState((s) => ({ ...s, isStreaming: false, isReasoningPhase: false }))
  }, [])

  const clearOutput = useCallback(() => {
    setState((s) => ({
      ...s,
      output: '',
      subject: '',
      reasoning: '',
      reasoningCapture: false,
      errMsg: ''
    }))
  }, [])

  const generate = useCallback(
    async (params: WorkflowGenerateParams) => {
      if (isGeneratingRef.current) return { ok: false as const }
      const { url, id_skill, captureReasoning: captureReasoningOverride } = params
      if (!url) return { ok: false as const }
      releaseCurrentVm()
      convId.current = crypto.randomUUID()
      const shouldCaptureReasoning = captureReasoningOverride ?? captureReasoning
      const requestId = crypto.randomUUID()
      activeRequestIdRef.current = requestId

      isGeneratingRef.current = true
      setState({
        output: '',
        subject: '',
        reasoning: '',
        isStreaming: true,
        isReasoningPhase: true,
        reasoningCapture: shouldCaptureReasoning,
        errMsg: ''
      })

      const session = createWorkflowStreamSession()
      const startedAt = performance.now()

      const streamThrottle = createRafThrottle(() => {
        const parsed = parseWorkflowStream(session.text, id_skill, true)
        const hasOutput = !!parsed.output.trim()
        setState((s) => ({
          ...s,
          output: parsed.output,
          subject: parsed.subject,
          reasoning: session.thinking,
          isReasoningPhase: isWorkflowReasoningPhase({
            isStreaming: true,
            hasOutput,
            captureReasoning: shouldCaptureReasoning,
            resetsSeen: session.toolCallsSeen,
            hadReasoningDelta: session.thinking.length > 0
          })
        }))
      })

      const { ok, cancelled } = await runNdjsonStream({
        requestId,
        start: (activeRequestId) =>
          window.api.generateAnswer({
            ...params,
            conv_id: convId.current,
            requestId: activeRequestId
          }),
        isCancelled: () => !isGeneratingRef.current,
        onEvent: (event) => {
          if (event.type === 'error') {
            setState((s) => ({ ...s, errMsg: 'Erreur de génération.' }))
            return
          }
          applyWorkflowStreamEvent(session, event, shouldCaptureReasoning)
          if (
            event.type === 'text_delta' ||
            event.type === 'text_end' ||
            event.type === 'thinking_delta' ||
            event.type === 'thinking_end' ||
            event.type === 'toolcall_start' ||
            event.type === 'message_end' ||
            event.type === 'stream_end'
          ) {
            streamThrottle.schedule()
          }
        }
      })

      streamThrottle.flushNow()

      if (cancelled) {
        activeRequestIdRef.current = null
        isGeneratingRef.current = false
        return { ok: false as const, cancelled: true }
      }

      if (!ok) {
        activeRequestIdRef.current = null
        setState((s) => ({
          ...s,
          errMsg: 'Erreur de génération.',
          isStreaming: false,
          isReasoningPhase: false
        }))
        isGeneratingRef.current = false
        onErrorReturnToForm?.()
        return { ok: false as const }
      }

      const finalParsed = parseWorkflowStream(session.text, id_skill, false)
      const generation_duration_ms = Math.round(performance.now() - startedAt)
      activeRequestIdRef.current = null
      setState((s) => ({
        ...s,
        output: finalParsed.output,
        subject: finalParsed.subject,
        isStreaming: false,
        isReasoningPhase: false,
        errMsg: ''
      }))
      isGeneratingRef.current = false
      return {
        ok: true as const,
        output: finalParsed.output,
        subject: finalParsed.subject,
        raw: finalParsed.raw,
        reasoning: session.thinking,
        generated_duration_ms: generation_duration_ms
      }
    },
    [captureReasoning, onErrorReturnToForm, releaseCurrentVm]
  )

  const patchState = useCallback((patch: Partial<WorkflowGenerationState>) => {
    setState((s) => {
      const changed = (Object.keys(patch) as (keyof WorkflowGenerationState)[]).some(
        (key) => patch[key] !== s[key]
      )
      return changed ? { ...s, ...patch } : s
    })
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
