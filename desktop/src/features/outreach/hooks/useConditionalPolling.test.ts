import { describe, expect, test } from 'bun:test'

import {
  createConditionalPoller,
  REPORT_POLL_INTERVAL
} from '@/features/outreach/hooks/useConditionalPolling'

type TimerId = ReturnType<typeof setTimeout>

class FakeTimers {
  private now = 0
  private sequence = 0
  private timers = new Map<TimerId, { at: number; callback: () => void }>()

  setTimeout = (callback: () => void, delay: number): TimerId => {
    const id = ++this.sequence as unknown as TimerId
    this.timers.set(id, { at: this.now + delay, callback })
    return id
  }

  clearTimeout = (id: TimerId) => {
    this.timers.delete(id)
  }

  advanceBy(delay: number) {
    this.now += delay
    const due = [...this.timers.entries()]
      .filter(([, timer]) => timer.at <= this.now)
      .sort((left, right) => left[1].at - right[1].at)
    for (const [id, timer] of due) {
      this.timers.delete(id)
      timer.callback()
    }
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('polling conditionnel des rapports', () => {
  test('fetch immédiatement, attend 15 s et s’arrête sur un état terminal', async () => {
    const timers = new FakeTimers()
    let calls = 0
    const received: string[] = []
    const poller = createConditionalPoller({
      scheduler: timers,
      fetchData: async () => (++calls === 1 ? 'in_progress' : 'ok'),
      onData: (status) => received.push(status),
      shouldPoll: (status) => status === 'in_progress'
    })

    poller.start()
    await flush()
    expect(calls).toBe(1)
    expect(received).toEqual(['in_progress'])

    timers.advanceBy(REPORT_POLL_INTERVAL - 1)
    expect(calls).toBe(1)
    timers.advanceBy(1)
    await flush()
    expect(calls).toBe(2)
    expect(received).toEqual(['in_progress', 'ok'])

    timers.advanceBy(REPORT_POLL_INTERVAL * 2)
    expect(calls).toBe(2)
  })

  test('le focus est immédiat sans chevaucher une requête en cours', async () => {
    const timers = new FakeTimers()
    const first = deferred<string>()
    const second = deferred<string>()
    let calls = 0
    const poller = createConditionalPoller({
      scheduler: timers,
      fetchData: () => (++calls === 1 ? first.promise : second.promise),
      onData: () => {},
      shouldPoll: () => true
    })

    poller.start()
    poller.focus()
    poller.focus()
    expect(calls).toBe(1)

    first.resolve('in_progress')
    await flush()
    expect(calls).toBe(2)

    second.resolve('ok')
    await flush()
    poller.stop()
  })

  test('le cleanup annule la requête et ignore sa réponse obsolète', async () => {
    const timers = new FakeTimers()
    const pending = deferred<string>()
    const signals: AbortSignal[] = []
    const received: string[] = []
    const poller = createConditionalPoller({
      scheduler: timers,
      fetchData: (nextSignal) => {
        signals.push(nextSignal)
        return pending.promise
      },
      onData: (status) => received.push(status),
      shouldPoll: () => true
    })

    poller.start()
    poller.stop()
    expect(signals[0]?.aborted).toBe(true)
    pending.resolve('in_progress')
    await flush()
    timers.advanceBy(REPORT_POLL_INTERVAL)
    expect(received).toEqual([])
  })

  test('conserve les données et réessaie après une erreur transitoire', async () => {
    const timers = new FakeTimers()
    let calls = 0
    const received: string[] = []
    const poller = createConditionalPoller({
      scheduler: timers,
      fetchData: async () => {
        calls += 1
        if (calls === 2) throw new Error('network')
        return calls === 1 ? 'in_progress' : 'ok'
      },
      onData: (status) => received.push(status),
      shouldPoll: (status) => status === 'in_progress'
    })

    poller.start()
    await flush()
    timers.advanceBy(REPORT_POLL_INTERVAL)
    await flush()
    expect(received).toEqual(['in_progress'])

    timers.advanceBy(REPORT_POLL_INTERVAL)
    await flush()
    expect(received).toEqual(['in_progress', 'ok'])
    expect(calls).toBe(3)
  })
})
