import { describe, expect, it } from 'bun:test'

import { parseWorkflowPayload, WORKFLOW_USER_PROMPT } from '../../../utils/workflow-payload'

describe('workflow-payload', () => {
  it('WORKFLOW_USER_PROMPT is a minimal trigger for all workflow skills', () => {
    expect(WORKFLOW_USER_PROMPT).toBe('Exécute la mission.')
  })

  it('parseWorkflowPayload accepts each synthese id key', () => {
    for (const key of ['id_locataire', 'id_client', 'id_lot', 'id_batiment'] as const) {
      expect(
        parseWorkflowPayload(
          JSON.stringify({
            [key]: '121284',
            year_from: 2000,
            year_to: 2029
          })
        )
      ).toMatchObject({ [key]: '121284', year_from: 2000, year_to: 2029 })
    }
  })

  it('parseWorkflowPayload rejects zero or two id keys', () => {
    expect(parseWorkflowPayload(JSON.stringify({ year_from: 2000, year_to: 2029 }))).toBeNull()
    expect(
      parseWorkflowPayload(
        JSON.stringify({
          id_locataire: '121284',
          id_client: '99',
          year_from: 2000,
          year_to: 2029
        })
      )
    ).toBeNull()
  })

  it('parseWorkflowPayload rejects an empty or non-json body', () => {
    expect(parseWorkflowPayload('')).toBeNull()
    expect(parseWorkflowPayload('not-json')).toBeNull()
  })
})
