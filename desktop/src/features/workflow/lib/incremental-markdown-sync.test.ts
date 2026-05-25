import { describe, expect, test } from 'bun:test'

import { computeMarkdownSyncPlan } from './incremental-markdown-sync'

describe('computeMarkdownSyncPlan', () => {
  test('skips identical content', () => {
    expect(computeMarkdownSyncPlan('hello', 'hello')).toEqual({ mode: 'skip' })
  })

  test('appends plain suffix', () => {
    expect(computeMarkdownSyncPlan('Hello', 'Hello world')).toEqual({
      mode: 'append',
      delta: ' world'
    })
  })

  test('full sync when prefix diverges', () => {
    expect(computeMarkdownSyncPlan('Hello', 'Hi')).toEqual({ mode: 'full' })
  })

  test('full sync when suffix contains markdown', () => {
    expect(computeMarkdownSyncPlan('Text', 'Text\n\n- item')).toEqual({ mode: 'full' })
    expect(computeMarkdownSyncPlan('Text', 'Text **bold**')).toEqual({ mode: 'full' })
  })
})
