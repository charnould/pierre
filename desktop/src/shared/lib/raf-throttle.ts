/**
 * Coalesces rapid callbacks to one invocation per animation frame.
 * An optional minimum interval can cap the publication rate across frames.
 */
export function createRafThrottle(flush: () => void, minIntervalMs = 0) {
  let scheduled = false
  let rafId = 0
  let lastFlushAt: number | null = null

  const runOnFrame = (timestamp: number) => {
    if (lastFlushAt !== null && timestamp - lastFlushAt < minIntervalMs) {
      rafId = requestAnimationFrame(runOnFrame)
      return
    }
    scheduled = false
    rafId = 0
    lastFlushAt = timestamp
    flush()
  }

  const schedule = () => {
    if (scheduled) return
    scheduled = true
    rafId = requestAnimationFrame(runOnFrame)
  }

  const flushNow = () => {
    if (scheduled) {
      cancelAnimationFrame(rafId)
      scheduled = false
      rafId = 0
    }
    lastFlushAt = null
    flush()
  }

  const cancel = () => {
    if (!scheduled) return
    cancelAnimationFrame(rafId)
    scheduled = false
    rafId = 0
  }

  return { schedule, flushNow, cancel }
}
