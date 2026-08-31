import {
  createAiStreamState,
  reduceAiStreamState,
  type AiStreamEvent,
  type AiStreamState
} from '../../../../../shared/ai-stream-events'

export type WorkflowStreamSession = AiStreamState

export function createWorkflowStreamSession(): WorkflowStreamSession {
  return createAiStreamState()
}

/** Applies one canonical event, optionally dropping private thinking content. */
export function applyWorkflowStreamEvent(
  session: WorkflowStreamSession,
  event: AiStreamEvent,
  captureReasoning: boolean
): void {
  if (
    !captureReasoning &&
    (event.type === 'thinking_start' ||
      event.type === 'thinking_delta' ||
      event.type === 'thinking_end')
  ) {
    return
  }
  if (!captureReasoning && event.type === 'message_end') {
    reduceAiStreamState(session, {
      ...event,
      message: {
        ...event.message,
        content: event.message.content.filter((part) => part.type !== 'thinking')
      }
    })
    return
  }
  reduceAiStreamState(session, event)
}

/**
 * Whether the workflow UI should show the full-screen reasoning stream (ambient + auto-scroll)
 * vs the response column (collapsed reasoning accordion + output stream).
 */
export function isWorkflowReasoningPhase(opts: {
  isStreaming: boolean
  hasOutput: boolean
  captureReasoning: boolean
  resetsSeen: number
  hadReasoningDelta: boolean
}): boolean {
  if (!opts.isStreaming) return false
  if (!opts.hasOutput) return true
  if (!opts.captureReasoning) return false
  if (opts.resetsSeen > 0) return false
  if (opts.hadReasoningDelta) return true
  return false
}
