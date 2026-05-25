import { parseAiStreamLine, type AiStreamEvent } from '@/features/workflow/lib/parse-workflow-chunk'

import { createNdjsonLineBuffer } from './ndjson-buffer'
import { warnRenderer } from './renderer-log'

export type RunNdjsonStreamOptions = {
  /** Logical stream id used for request-scoped IPC channels. */
  requestId: string
  /** IPC call that streams NDJSON via `onAiChunk` until settled. */
  start: (requestId: string) => Promise<boolean>
  onEvent: (event: AiStreamEvent) => void
  isCancelled?: () => boolean
}

export type RunNdjsonStreamResult = {
  ok: boolean
  cancelled: boolean
}

/** Abort a specific main-process stream. */
export function cancelNdjsonStream(requestId: string): void {
  void window.api.cancelStream(requestId)
}

/**
 * Shared transport for `/ai` and `/ai/answer`: buffer chunks → NDJSON lines → `onEvent`.
 */
export async function runNdjsonStream({
  requestId,
  start,
  onEvent,
  isCancelled = () => false
}: RunNdjsonStreamOptions): Promise<RunNdjsonStreamResult> {
  const lineBuffer = createNdjsonLineBuffer((line) => {
    const event = parseAiStreamLine(line)
    if (event) onEvent(event)
  })

  const unsubscribe = window.api.onAiChunk(requestId, (chunk) => lineBuffer.push(chunk))

  try {
    const ok = await start(requestId)
    const cancelled = isCancelled()

    unsubscribe()
    if (cancelled) {
      lineBuffer.clear()
      return { ok: false, cancelled: true }
    }

    lineBuffer.flush()
    return { ok, cancelled: false }
  } catch (error) {
    warnRenderer('run-ndjson-stream', error)
    unsubscribe()
    lineBuffer.clear()
    return { ok: false, cancelled: isCancelled() }
  }
}
