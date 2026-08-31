import { describe, expect, test } from 'bun:test'

import {
  TIMELINE_CONTENT_INSET_CLASS,
  TIMELINE_HIGHLIGHT_CLASS,
  TIMELINE_INDICATOR_CLASS,
  TIMELINE_ITEM_OFFSET_CLASS,
  TIMELINE_SEPARATOR_CLASS
} from './timeline-layout'

describe('Inspector timeline geometry', () => {
  test('content inset is 32 + 8 (ms-10)', () => {
    expect(TIMELINE_ITEM_OFFSET_CLASS).toContain('ms-10')
    expect(TIMELINE_CONTENT_INSET_CLASS).toBe('ms-10')
  })

  test('indicator is the size-8 node, left-aligned with card anchors', () => {
    expect(TIMELINE_INDICATOR_CLASS).toContain('size-8')
    expect(TIMELINE_INDICATOR_CLASS).toContain('-left-6')
    expect(TIMELINE_INDICATOR_CLASS).not.toContain('size-10')
  })

  test('separator is centered on the size-8 node', () => {
    expect(TIMELINE_SEPARATOR_CLASS).toContain('-left-6')
    expect(TIMELINE_SEPARATOR_CLASS).toContain('translate-y-8')
    expect(TIMELINE_SEPARATOR_CLASS).toContain('h-[calc(100%-2rem)]')
    expect(TIMELINE_SEPARATOR_CLASS).toContain('w-px!')
    expect(TIMELINE_SEPARATOR_CLASS).toContain('bg-border/60!')
  })

  test('highlight covers the compact rail, not the Activity 40 px gutter', () => {
    expect(TIMELINE_HIGHLIGHT_CLASS).toContain('-start-17')
    expect(TIMELINE_HIGHLIGHT_CLASS).not.toContain('-start-18')
  })
})
