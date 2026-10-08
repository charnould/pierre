import { describe, expect, test } from 'bun:test'

import { readMascotUnreadCount } from './unread-count'

describe('readMascotUnreadCount', () => {
  test('reads the current payload', () => {
    expect(readMascotUnreadCount({ count: 3, orbit: false })).toEqual({ count: 3, orbit: false })
  })

  test('rejects a retired numeric payload', () => {
    expect(readMascotUnreadCount(3)).toBeNull()
    expect(readMascotUnreadCount({ count: 3 })).toBeNull()
  })
})
