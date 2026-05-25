import { describe, expect, it } from 'bun:test'

import { mergeUiSettings } from './schema'
import { resolveWorkflowOutputSplit } from './workflow-output'

describe('workflow dual split isolation', () => {
  it('resolveWorkflowOutputSplit returns independent values per key', () => {
    const workflow = {
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: 55 }
    }
    expect(resolveWorkflowOutputSplit(workflow, 'ticketsOutputSplit').contextePercent).toBe(40)
    expect(resolveWorkflowOutputSplit(workflow, 'aboutOutputSplit').contextePercent).toBe(55)
  })

  it('mergeUiSettings preserves distinct values for each workflow split key', () => {
    expect(
      mergeUiSettings({
        workflow: {
          ticketsOutputSplit: { contextePercent: 33 },
          aboutOutputSplit: { contextePercent: 61 }
        }
      }).workflow
    ).toEqual({
      ticketsOutputSplit: { contextePercent: 33 },
      aboutOutputSplit: { contextePercent: 61 }
    })
  })

  it('mergeUiSettings defaults each split to 28% when missing', () => {
    expect(mergeUiSettings({}).workflow).toEqual({
      ticketsOutputSplit: { contextePercent: 28 },
      aboutOutputSplit: { contextePercent: 28 }
    })
  })

  it('updating one split in user settings does not overwrite the other', () => {
    const merged = mergeUiSettings({
      workflow: {
        ticketsOutputSplit: { contextePercent: 42 }
      }
    })
    expect(merged.workflow?.ticketsOutputSplit).toEqual({ contextePercent: 42 })
    expect(merged.workflow?.aboutOutputSplit).toEqual({ contextePercent: 28 })
  })
})
