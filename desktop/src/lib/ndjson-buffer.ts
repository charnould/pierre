/**
 * Accumulates IPC stream chunks and emits complete NDJSON lines (newline-delimited).
 */
export function createNdjsonLineBuffer(onLine: (line: string) => void) {
  let buffer = ''

  return {
    push(chunk: string) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        onLine(line)
      }
    },
    /** Emit any trailing bytes as one final line (trimmed empty lines are skipped). */
    flush() {
      const trailing = buffer.trim()
      if (trailing) {
        onLine(buffer)
      }
      buffer = ''
    },
    clear() {
      buffer = ''
    }
  }
}
