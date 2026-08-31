import { describe, expect, test } from 'bun:test'

import { shouldNavigateHomeOnEscape } from './app-escape-home'

describe('shouldNavigateHomeOnEscape', () => {
  test('navigates from chat when logged in', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'chat',
        isLoggedIn: true,
        isTypingInField: false,
        hasOpenDialog: false
      })
    ).toBe(true)
  })

  test('no-op on home', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'home',
        isLoggedIn: true,
        isTypingInField: false,
        hasOpenDialog: false
      })
    ).toBe(false)
  })

  test('delegates tickets to workflow keyboard', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'tickets',
        isLoggedIn: true,
        isTypingInField: false,
        hasOpenDialog: false
      })
    ).toBe(false)
  })

  test('delegates about to workflow keyboard', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'about',
        isLoggedIn: true,
        isTypingInField: false,
        hasOpenDialog: false
      })
    ).toBe(false)
  })

  test('blocked while typing', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'chat',
        isLoggedIn: true,
        isTypingInField: true,
        hasOpenDialog: false
      })
    ).toBe(false)
  })

  test('blocked when dialog is open', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'chat',
        isLoggedIn: true,
        isTypingInField: false,
        hasOpenDialog: true
      })
    ).toBe(false)
  })

  test('blocked when find-in-page is open', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'chat',
        isLoggedIn: true,
        isTypingInField: false,
        hasOpenDialog: false,
        hasOpenFindInPage: true
      })
    ).toBe(false)
  })

  test('blocked when logged out', () => {
    expect(
      shouldNavigateHomeOnEscape({
        activeTab: 'chat',
        isLoggedIn: false,
        isTypingInField: false,
        hasOpenDialog: false
      })
    ).toBe(false)
  })
})
