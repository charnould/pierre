import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createRafThrottle } from './raf-throttle'

describe('createRafThrottle', () => {
  let rafCallbacks: Array<FrameRequestCallback> = []

  beforeEach(() => {
    rafCallbacks = []
    globalThis.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    }
    globalThis.cancelAnimationFrame = (id) => {
      rafCallbacks[id - 1] = () => {}
    }
  })

  afterEach(() => {
    delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
      .requestAnimationFrame
    delete (globalThis as { cancelAnimationFrame?: typeof cancelAnimationFrame })
      .cancelAnimationFrame
  })

  test('flushNow cancels a pending frame so flush runs once', () => {
    let count = 0
    const throttle = createRafThrottle(() => {
      count += 1
    })

    throttle.schedule()
    throttle.flushNow()

    for (const cb of rafCallbacks) cb(0)

    expect(count).toBe(1)
  })
})
