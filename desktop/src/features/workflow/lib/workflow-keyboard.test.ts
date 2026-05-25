import { describe, expect, test } from 'bun:test'

import { isTypingInField, shouldEscapeNavigateHome } from './workflow-keyboard'

describe('shouldEscapeNavigateHome', () => {
  test('form step navigates home', () => {
    expect(shouldEscapeNavigateHome('form', false)).toBe(true)
  })

  test('output step stays on panel', () => {
    expect(shouldEscapeNavigateHome('output', false)).toBe(false)
  })

  test('streaming stays on panel even on form step', () => {
    expect(shouldEscapeNavigateHome('form', true)).toBe(false)
  })
})

describe('isTypingInField', () => {
  test('returns true for textarea and input', () => {
    expect(isTypingInField({ tagName: 'TEXTAREA', readOnly: false })).toBe(true)
    expect(isTypingInField({ tagName: 'INPUT', readOnly: false })).toBe(true)
  })

  test('returns false for readonly fields and other targets', () => {
    expect(isTypingInField({ tagName: 'TEXTAREA', readOnly: true })).toBe(false)
    expect(isTypingInField({ tagName: 'BUTTON' })).toBe(false)
    expect(isTypingInField(null)).toBe(false)
  })
})
