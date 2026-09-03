import { describe, expect, test } from 'bun:test'

import {
  consumeUiResponseCapability,
  expireUiResponseCapability,
  hashResponseSecret,
  matchesResponseSecret,
  scheduleUiResponseExpiry,
  UI_RESPONSE_TIMEOUT_MS,
  type UiResponseCapability
} from '../../utils/vm-registry'

describe('VM registry UI response capability', () => {
  test('accepts only the exact response secret regardless of candidate length', () => {
    const expected = hashResponseSecret('correct-secret')

    expect(matchesResponseSecret(expected, 'correct-secret')).toBe(true)
    expect(matchesResponseSecret(expected, 'wrong-secret')).toBe(false)
    expect(matchesResponseSecret(expected, '')).toBe(false)
    expect(matchesResponseSecret(expected, 'x'.repeat(4096))).toBe(false)
  })

  test('spends a matching capability exactly once', () => {
    const capability: UiResponseCapability = {
      requestId: 'request-1',
      responseSecretHash: hashResponseSecret('secret'),
      consumed: false
    }

    expect(consumeUiResponseCapability(capability, 'request-1', 'secret')).toBe(true)
    expect(consumeUiResponseCapability(capability, 'request-1', 'secret')).toBe(false)
  })

  test('bounds the configured wait and allows expiry timers to be cleared', async () => {
    expect(UI_RESPONSE_TIMEOUT_MS).toBeGreaterThanOrEqual(1_000)
    expect(UI_RESPONSE_TIMEOUT_MS).toBeLessThanOrEqual(10 * 60 * 1_000)

    const capability: UiResponseCapability = {
      requestId: 'request-expiring',
      responseSecretHash: hashResponseSecret('secret'),
      consumed: false
    }
    let cancellations = 0
    let settled = 0
    scheduleUiResponseExpiry(() => {
      if (!expireUiResponseCapability(capability)) return
      cancellations++
      settled++
    }, 5)
    const cleared = scheduleUiResponseExpiry(() => cancellations++, 5)
    clearTimeout(cleared)
    await Bun.sleep(20)

    expect(capability.consumed).toBe(true)
    expect(cancellations).toBe(1)
    expect(settled).toBe(1)
    expect(expireUiResponseCapability(capability)).toBe(false)
  })
})
