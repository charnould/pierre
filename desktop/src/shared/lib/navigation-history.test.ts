import { describe, expect, test } from 'bun:test'

import {
  canGoBackInTab,
  canGoBackInTicketsStack,
  canGoForwardInTab,
  canGoForwardInTicketsStack,
  type NavigationStack
} from './navigation-history'
import type { NavigationSnapshot } from './navigation-snapshot'

const ticketsForm: NavigationSnapshot = {
  tab: 'tickets',
  tickets: {
    step: 'form',
    ticketNumber: '',
    tenantNumber: '',
    message: '',
    context: '',
    ticketFormat: 'ticketReplyEmail'
  }
}

const ticketsOutput: NavigationSnapshot = {
  tab: 'tickets',
  tickets: {
    step: 'output',
    ticketNumber: '716274',
    tenantNumber: '',
    message: '',
    context: '',
    ticketFormat: 'ticketReplyEmail'
  }
}

function stack(entries: NavigationSnapshot[], index: number): NavigationStack {
  return { entries, index }
}

describe('canGoBackInTab', () => {
  test('allows back when previous entry is in the same tab', () => {
    const s = stack([{ tab: 'home' }, ticketsForm, ticketsOutput], 2)
    expect(canGoBackInTab(s, 'tickets')).toBe(true)
  })

  test('denies back when previous entry is another tab', () => {
    const s = stack([{ tab: 'home' }, ticketsForm], 1)
    expect(canGoBackInTab(s, 'tickets')).toBe(false)
  })

  test('denies back at stack start', () => {
    const s = stack([ticketsForm], 0)
    expect(canGoBackInTab(s, 'tickets')).toBe(false)
  })
})

describe('canGoForwardInTab', () => {
  test('allows forward when next entry is in the same tab', () => {
    const s = stack([ticketsForm, ticketsOutput, ticketsForm], 1)
    expect(canGoForwardInTab(s, 'tickets')).toBe(true)
  })

  test('denies forward when next entry is another tab', () => {
    const s = stack([ticketsForm, ticketsOutput, { tab: 'home' }], 1)
    expect(canGoForwardInTab(s, 'tickets')).toBe(false)
  })

  test('denies forward at stack end', () => {
    const s = stack([ticketsForm, ticketsOutput], 1)
    expect(canGoForwardInTab(s, 'tickets')).toBe(false)
  })
})

describe('canGoBackInTicketsStack', () => {
  test('allows back from output to form', () => {
    const s = stack([ticketsForm, ticketsOutput], 1)
    expect(canGoBackInTicketsStack(s)).toBe(true)
  })

  test('allows back when home precedes form', () => {
    const s = stack([{ tab: 'home' }, ticketsForm, ticketsOutput], 2)
    expect(canGoBackInTicketsStack(s)).toBe(true)
  })

  test('denies back on form view', () => {
    const s = stack([ticketsForm, ticketsOutput], 0)
    expect(canGoBackInTicketsStack(s)).toBe(false)
  })

  test('denies back when previous entry is also form', () => {
    const s = stack([ticketsForm, ticketsForm], 1)
    expect(canGoBackInTicketsStack(s)).toBe(false)
  })

  test('denies back when previous entry is another tab', () => {
    const s = stack([{ tab: 'home' }, ticketsOutput], 1)
    expect(canGoBackInTicketsStack(s)).toBe(false)
  })
})

describe('canGoForwardInTicketsStack', () => {
  test('allows forward from form to output', () => {
    const s = stack([ticketsForm, ticketsOutput], 0)
    expect(canGoForwardInTicketsStack(s)).toBe(true)
  })

  test('denies forward on output view', () => {
    const s = stack([ticketsForm, ticketsOutput], 1)
    expect(canGoForwardInTicketsStack(s)).toBe(false)
  })

  test('denies forward when next entry is also form', () => {
    const s = stack([ticketsForm, ticketsForm], 0)
    expect(canGoForwardInTicketsStack(s)).toBe(false)
  })

  test('denies forward at stack end', () => {
    const s = stack([ticketsForm], 0)
    expect(canGoForwardInTicketsStack(s)).toBe(false)
  })
})
