/** Default flush interval (~1 frame) to reduce IPC chatter during NDJSON streaming. */
export const STREAM_BATCH_FLUSH_MS = 16

/**
 * Coalesces small network chunks before sending them to the renderer.
 */
export function createStreamBatcher(
  emit: (chunk: string) => void,
  flushMs = STREAM_BATCH_FLUSH_MS
) {
  let buffer = ''
  let timer: ReturnType<typeof setTimeout> | null = null

  const flushNow = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!buffer) return
    const chunk = buffer
    buffer = ''
    emit(chunk)
  }

  return {
    push(chunk: string) {
      if (!chunk) return
      buffer += chunk
      if (!timer) {
        timer = setTimeout(flushNow, flushMs)
      }
    },
    /** Flushes any buffered bytes immediately (call at end of stream). */
    flush() {
      flushNow()
    }
  }
}
