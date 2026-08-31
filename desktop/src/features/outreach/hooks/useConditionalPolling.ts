import { useEffect } from 'react'

export const REPORT_POLL_INTERVAL = 15_000

interface PollingScheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void
}

interface ConditionalPollerOptions<T> {
  fetchData: (signal: AbortSignal) => Promise<T>
  onData: (data: T) => void
  shouldPoll: (data: T) => boolean
  interval?: number
  scheduler?: PollingScheduler
}

export function createConditionalPoller<T>({
  fetchData,
  onData,
  shouldPoll,
  interval = REPORT_POLL_INTERVAL,
  scheduler = globalThis
}: ConditionalPollerOptions<T>) {
  let active = false
  let generation = 0
  let inFlight = false
  let refreshAfterFlight = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null

  const clearTimer = () => {
    if (timer === null) return
    scheduler.clearTimeout(timer)
    timer = null
  }

  const request = async () => {
    if (!active) return
    if (inFlight) {
      refreshAfterFlight = true
      return
    }
    clearTimer()
    inFlight = true
    const requestGeneration = generation
    const requestController = new AbortController()
    controller = requestController
    let data: T
    try {
      data = await fetchData(requestController.signal)
    } catch (error) {
      if (
        active &&
        requestGeneration === generation &&
        !(error instanceof DOMException && error.name === 'AbortError')
      ) {
        timer = scheduler.setTimeout(() => void request(), interval)
      }
      return
    } finally {
      if (requestGeneration === generation) {
        inFlight = false
        if (controller === requestController) controller = null
      }
    }
    if (!active || requestGeneration !== generation || requestController.signal.aborted) return
    onData(data)
    if (refreshAfterFlight) {
      refreshAfterFlight = false
      void request()
    } else if (shouldPoll(data)) {
      timer = scheduler.setTimeout(() => void request(), interval)
    }
  }

  return {
    start() {
      if (active) return
      active = true
      generation += 1
      void request()
    },
    focus() {
      if (!active) return
      void request()
    },
    stop() {
      active = false
      generation += 1
      refreshAfterFlight = false
      clearTimer()
      controller?.abort()
      controller = null
      inFlight = false
    }
  }
}

export function useConditionalPolling<T>(
  options: ConditionalPollerOptions<T> & { enabled?: boolean }
): void {
  const { enabled = true, fetchData, onData, shouldPoll, interval, scheduler } = options

  useEffect(() => {
    if (!enabled) return
    const poller = createConditionalPoller({
      fetchData,
      onData,
      shouldPoll,
      interval,
      scheduler
    })
    const handleFocus = () => poller.focus()
    poller.start()
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      poller.stop()
    }
  }, [enabled, fetchData, interval, onData, scheduler, shouldPoll])
}
