import { describe, expect, it } from 'bun:test'

import {
  defaultUpdatesPanelLayout,
  listPercentFromUpdatesLayout,
  parseUpdatesPanelSplit,
  parseUpdatesListPercent,
  splitFromUpdatesLayout
} from './updates-panel'

describe('updates panel split settings', () => {
  it('parses valid list percent', () => {
    expect(parseUpdatesListPercent(32)).toBe(32)
    expect(parseUpdatesListPercent('40')).toBe(40)
    expect(parseUpdatesListPercent(20)).toBeUndefined()
    expect(parseUpdatesListPercent(50)).toBeUndefined()
  })

  it('parses panelSplit object', () => {
    expect(parseUpdatesPanelSplit({ listPercent: 32 })).toEqual({ listPercent: 32 })
    expect(parseUpdatesPanelSplit({ listPercent: 99 })).toBeUndefined()
    expect(parseUpdatesPanelSplit({})).toBeUndefined()
  })

  it('builds default 2-panel layout', () => {
    expect(defaultUpdatesPanelLayout()).toEqual({
      list: 28,
      detail: 72
    })
    expect(defaultUpdatesPanelLayout({ listPercent: 40 })).toEqual({
      list: 40,
      detail: 60
    })
  })

  it('reads split percent from layout', () => {
    expect(listPercentFromUpdatesLayout({ list: 40, detail: 60 })).toBe(40)
    expect(listPercentFromUpdatesLayout({})).toBe(28)
    expect(splitFromUpdatesLayout({ list: 25, detail: 75 })).toEqual({ listPercent: 25 })
  })
})
