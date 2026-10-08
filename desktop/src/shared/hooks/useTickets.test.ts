import { describe, expect, test } from 'bun:test'

import { ticketsListScopeChanged } from './useTickets'

describe('tickets list scope', () => {
  test('un changement de tri remet la pagination au début', () => {
    const page = {
      filtersKey: '{}',
      url: 'http://localhost',
      bucket: 'non_traitees',
      sort: undefined
    }
    expect(ticketsListScopeChanged(page, { ...page, sort: 'motif' })).toBe(true)
    expect(ticketsListScopeChanged(page, page)).toBe(false)
  })
})
