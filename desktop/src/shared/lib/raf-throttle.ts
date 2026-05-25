/**
 * Coalesces rapid callbacks to one invocation per animation frame.
 * Returns a flush function to apply pending work immediately (e.g. at stream end).
 */
export function createRafThrottle(flush: () => void) {
  let scheduled = false
  let rafId = 0

  const schedule = () => {
    if (scheduled) return
    scheduled = true
    rafId = requestAnimationFrame(() => {
      scheduled = false
      rafId = 0
      flush()
    })
  }

  const flushNow = () => {
    if (scheduled) {
      cancelAnimationFrame(rafId)
      scheduled = false
      rafId = 0
    }
    flush()
  }

  return { schedule, flushNow }
}
