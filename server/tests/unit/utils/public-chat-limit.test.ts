import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import {
  beginPublicChat,
  publicChatAddress,
  resetPublicChatLimit
} from '../../../utils/public-chat-limit'

const originalPerMinute = Bun.env['PUBLIC_CHAT_PER_MINUTE']
const originalMaxActive = Bun.env['SMOLVM_MAX_ACTIVE']

beforeEach(() => {
  Bun.env['PUBLIC_CHAT_PER_MINUTE'] = '20'
  Bun.env['SMOLVM_MAX_ACTIVE'] = '8'
})

afterEach(() => {
  resetPublicChatLimit()
  if (originalPerMinute === undefined) delete Bun.env['PUBLIC_CHAT_PER_MINUTE']
  else Bun.env['PUBLIC_CHAT_PER_MINUTE'] = originalPerMinute
  if (originalMaxActive === undefined) delete Bun.env['SMOLVM_MAX_ACTIVE']
  else Bun.env['SMOLVM_MAX_ACTIVE'] = originalMaxActive
})

describe('public chat limit', () => {
  it('uses the address added by the nearest proxy', () => {
    const request = new Request('http://localhost/chat', {
      headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.8' }
    })
    expect(publicChatAddress(request)).toBe('10.0.0.8')
    expect(publicChatAddress(new Request('http://localhost/chat'))).toBe('local')
  })

  it('limits one address and the number of active anonymous streams', () => {
    const now = 1_000_000
    for (let index = 0; index < 20; index += 1) {
      const gate = beginPublicChat('10.0.0.8', now)
      expect(gate.ok).toBe(true)
      if (gate.ok) gate.release()
    }
    expect(beginPublicChat('10.0.0.8', now).ok).toBe(false)
    expect(beginPublicChat('10.0.0.9', now + 60_000).ok).toBe(true)

    resetPublicChatLimit()
    const held = Array.from({ length: 8 }, () => beginPublicChat('10.0.0.1', now))
    expect(held.every((gate) => gate.ok)).toBe(true)
    expect(beginPublicChat('10.0.0.2', now).ok).toBe(false)
    if (held[0]?.ok) held[0].release()
    const next = beginPublicChat('10.0.0.2', now)
    expect(next.ok).toBe(true)
    if (next.ok) next.release()
  })
})
