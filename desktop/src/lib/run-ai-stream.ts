import { parseAiStreamLine, type AiStreamEvent } from '../workflows/parse-workflow-chunk'
import { createNdjsonLineBuffer } from './ndjson-buffer'

export type RunAiStreamOptions = {
  /** IPC call that streams NDJSON via `onAiChunk` until settled. */
  start: () => Promise<boolean>
  onEvent: (event: AiStreamEvent) => void
  isCancelled?: () => boolean
}

export type RunAiStreamResult = {
  ok: boolean
  cancelled: boolean
}

/** Abort the active main-process stream and detach the chunk listener. */
export function cancelAiStream(): void {
  void window.api.cancelStream()
  window.api.onAiChunk(() => {})
}

/**
 * Shared transport for `/ai` and `/ai/answer`: buffer chunks → NDJSON lines → `onEvent`.
 */
export async function runAiStream({
  start,
  onEvent,
  isCancelled = () => false
}: RunAiStreamOptions): Promise<RunAiStreamResult> {
  const lineBuffer = createNdjsonLineBuffer((line) => {
    const event = parseAiStreamLine(line)
    if (event) onEvent(event)
  })

  window.api.onAiChunk((chunk) => lineBuffer.push(chunk))

  try {
    const ok = await start()
    const cancelled = isCancelled()

    window.api.onAiChunk(() => {})
    if (cancelled) {
      lineBuffer.clear()
      return { ok: false, cancelled: true }
    }

    lineBuffer.flush()
    return { ok, cancelled: false }
  } catch {
    window.api.onAiChunk(() => {})
    lineBuffer.clear()
    return { ok: false, cancelled: isCancelled() }
  }
}
