import { describe, expect, it } from 'bun:test'

import { parseWorkflowPayload, WORKFLOW_USER_PROMPT } from '../../../utils/workflow-payload'

describe('workflow-payload', () => {
  it('WORKFLOW_USER_PROMPT is a minimal trigger for all workflow skills', () => {
    expect(WORKFLOW_USER_PROMPT).toBe('Exécute la mission.')
  })

  it('parseWorkflowPayload accepts channel on answer payload', () => {
    expect(
      parseWorkflowPayload(
        JSON.stringify({
          version: 1,
          workflow: 'answer',
          channel: 'letter',
          id_reclamation: 'REQ-1'
        })
      )
    ).toMatchObject({ channel: 'letter' })
  })

  it('parseWorkflowPayload accepts id_reclamation alone', () => {
    expect(
      parseWorkflowPayload(
        JSON.stringify({
          version: 1,
          workflow: 'answer',
          id_reclamation: 'REQ-1'
        })
      )
    ).toMatchObject({ id_reclamation: 'REQ-1' })
  })

  it('parseWorkflowPayload accepts message alone', () => {
    expect(
      parseWorkflowPayload(
        JSON.stringify({
          version: 1,
          workflow: 'answer',
          message: 'Bonjour'
        })
      )
    ).toMatchObject({ message: 'Bonjour' })
  })

  it('parseWorkflowPayload rejects empty answer payload', () => {
    expect(parseWorkflowPayload('')).toBeNull()
    expect(parseWorkflowPayload('not-json')).toBeNull()
    expect(
      parseWorkflowPayload(
        JSON.stringify({
          version: 1,
          workflow: 'answer',
          id_reclamation: '',
          message: ''
        })
      )
    ).toBeNull()
  })
})
