import { describe, expect, test } from 'bun:test'

export const WORKFLOW_CHOICE_ROW_CLASS = 'workflow-choice-row'
export const WORKFLOW_CHOICE_ROW_SELECTED_CLASS = 'workflow-choice-row--selected'
export const WORKFLOW_CHOICE_RADIO_GROUP_CLASS = 'workflow-choice-radio-group'
export const WORKFLOW_CHOICE_RADIO_SR_CLASS = 'workflow-choice-radio-sr'

describe('workflow choice class names', () => {
  test('use shared workflow-choice prefix for tickets and about pickers', () => {
    for (const className of [
      WORKFLOW_CHOICE_ROW_CLASS,
      WORKFLOW_CHOICE_ROW_SELECTED_CLASS,
      WORKFLOW_CHOICE_RADIO_GROUP_CLASS,
      WORKFLOW_CHOICE_RADIO_SR_CLASS
    ]) {
      expect(className.startsWith('workflow-choice-')).toBe(true)
    }
  })
})
