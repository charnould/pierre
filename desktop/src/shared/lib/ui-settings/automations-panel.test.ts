import { describe, expect, it } from 'bun:test'

import {
  defaultAutomationsPanelLayout,
  listPercentFromLayout,
  parseAutomationsPanelSplit,
  parseListPercent,
  splitFromAutomationsLayout
} from './automations-panel'

describe('automations panel split settings', () => {
  it('parses valid list percent', () => {
    expect(parseListPercent(33)).toBe(33)
    expect(parseListPercent('40')).toBe(40)
    expect(parseListPercent(10)).toBeUndefined()
    expect(parseListPercent(50)).toBeUndefined()
  })

  it('parses panelSplit object', () => {
    expect(parseAutomationsPanelSplit({ listPercent: 33 })).toEqual({ listPercent: 33 })
    expect(parseAutomationsPanelSplit({ listPercent: 99 })).toBeUndefined()
    expect(parseAutomationsPanelSplit({})).toBeUndefined()
  })

  it('builds default 2-panel layout', () => {
    expect(defaultAutomationsPanelLayout()).toEqual({
      'automations-list': 28,
      'automations-detail': 72
    })
    expect(defaultAutomationsPanelLayout({ listPercent: 40 })).toEqual({
      'automations-list': 40,
      'automations-detail': 60
    })
  })

  it('reads split percent from layout', () => {
    expect(listPercentFromLayout({ 'automations-list': 40, 'automations-detail': 60 })).toBe(40)
    expect(listPercentFromLayout({})).toBe(28)
    expect(
      splitFromAutomationsLayout({ 'automations-list': 25, 'automations-detail': 75 })
    ).toEqual({ listPercent: 25 })
  })
})
