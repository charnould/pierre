import { describe, expect, test } from 'bun:test'

import { isComposingEnter } from './ime-enter'

describe('isComposingEnter', () => {
  test('ignores a plain Enter', () => {
    expect(isComposingEnter({ key: 'Enter', isComposing: false, keyCode: 13 })).toBe(false)
  })

  test('catches a composition confirmed with isComposing', () => {
    expect(isComposingEnter({ key: 'Enter', isComposing: true, keyCode: 13 })).toBe(true)
  })

  test('catches Safari’s confirming Enter reported as keyCode 229', () => {
    expect(isComposingEnter({ key: 'Enter', isComposing: false, keyCode: 229 })).toBe(true)
  })

  test('ignores keyCode 229 when the key is not Enter', () => {
    expect(isComposingEnter({ key: 'a', isComposing: false, keyCode: 229 })).toBe(false)
  })
})
