import { describe, expect, test } from 'bun:test'

import { listOffsetInScroller } from './VirtualizedTableBody'

function elementAt(top: number): HTMLElement {
  return {
    getBoundingClientRect: () => ({ top })
  } as HTMLElement
}

describe('listOffsetInScroller', () => {
  test('conserve la position de la table lorsque le scroller avance', () => {
    const tbody = elementAt(228)
    const scroller = Object.assign(elementAt(20), { scrollTop: 500 })
    expect(listOffsetInScroller(tbody, scroller)).toBe(708)

    tbody.getBoundingClientRect = () => ({ top: 128 }) as DOMRect
    scroller.scrollTop = 600
    expect(listOffsetInScroller(tbody, scroller)).toBe(708)
  })
})
