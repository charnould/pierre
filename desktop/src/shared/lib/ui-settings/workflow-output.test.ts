import { describe, expect, it } from 'bun:test'

import {
  contextePercentFromLayout,
  defaultWorkflowPanelLayout,
  parseWorkflowTicketsOutputSplit,
  resolveWorkflowOutputSplit,
  splitFromLayout,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE
} from './workflow-output'

describe('workflow output split settings', () => {
  it('parses ticketsOutputSplit object (contexte only)', () => {
    expect(parseWorkflowTicketsOutputSplit({ contextePercent: 30 })).toEqual({
      contextePercent: 30
    })
    expect(parseWorkflowTicketsOutputSplit({ contextePercent: 30, extra: 35 })).toEqual({
      contextePercent: 30
    })
    expect(parseWorkflowTicketsOutputSplit({ extra: 45 })).toBeUndefined()
    expect(parseWorkflowTicketsOutputSplit({ contextePercent: 10 })).toBeUndefined()
    expect(parseWorkflowTicketsOutputSplit({ extra: 99 })).toBeUndefined()
  })

  it('builds default 2-panel layout', () => {
    expect(defaultWorkflowPanelLayout()).toEqual({
      contexte: 28,
      output: 72
    })
    expect(defaultWorkflowPanelLayout({ contextePercent: 25 })).toEqual({
      contexte: 25,
      output: 75
    })
  })

  it('reads split percents from layout', () => {
    expect(contextePercentFromLayout({ contexte: 30, output: 70 })).toBe(30)
    expect(contextePercentFromLayout({})).toBe(28)
    expect(splitFromLayout({ contexte: 25, output: 75 })).toEqual({
      contextePercent: 25
    })
  })

  it('resolveWorkflowOutputSplit reads the requested key with 28% default', () => {
    const workflow = {
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: 55 }
    }
    expect(resolveWorkflowOutputSplit(workflow, 'ticketsOutputSplit')).toEqual({
      contextePercent: 40
    })
    expect(resolveWorkflowOutputSplit(workflow, 'aboutOutputSplit')).toEqual({
      contextePercent: 55
    })
    expect(resolveWorkflowOutputSplit(undefined, 'aboutOutputSplit')).toEqual({
      contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE
    })
  })
})
