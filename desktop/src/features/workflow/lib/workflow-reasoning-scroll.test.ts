import { describe, expect, test } from 'bun:test'

import {
  distanceFromScrollBottom,
  isScrollPinned,
  WORKFLOW_REASONING_SCROLL_PIN_THRESHOLD_PX
} from './workflow-reasoning-scroll'

function mockScrollEl(scrollTop: number, scrollHeight: number, clientHeight: number) {
  return { scrollTop, scrollHeight, clientHeight } as HTMLElement
}

describe('distanceFromScrollBottom', () => {
  test('returns zero at bottom', () => {
    expect(distanceFromScrollBottom(mockScrollEl(200, 500, 300))).toBe(0)
  })

  test('returns gap above bottom', () => {
    expect(distanceFromScrollBottom(mockScrollEl(100, 500, 300))).toBe(100)
  })
})

describe('isScrollPinned', () => {
  test('is pinned within threshold', () => {
    expect(
      isScrollPinned(mockScrollEl(500 - 300 - WORKFLOW_REASONING_SCROLL_PIN_THRESHOLD_PX, 500, 300))
    ).toBe(true)
  })

  test('is not pinned when scrolled up', () => {
    expect(isScrollPinned(mockScrollEl(0, 500, 300))).toBe(false)
  })
})
