import { describe, expect, test } from 'bun:test'

import { resolveUpdatesNotifyScope } from './settings'

describe('resolveUpdatesNotifyScope', () => {
  test('always notifies, including a stored off value', () => {
    expect(resolveUpdatesNotifyScope({ updatesNotify: 'off' })).toBe('all')
    expect(resolveUpdatesNotifyScope({ updatesNotify: 'all' })).toBe('all')
    expect(resolveUpdatesNotifyScope({})).toBe('all')
  })
})
