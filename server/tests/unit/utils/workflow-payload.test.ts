import { describe, expect, it } from 'bun:test'

import {
  injectWorkflowPayload,
  parseWorkflowPayload,
  WORKFLOW_USER_PROMPT
} from '../../../utils/workflow-payload'

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

  it('accepts a repayment mission without a period and rejects the about shape', () => {
    expect(
      parseWorkflowPayload(
        JSON.stringify({ id_locataire: 'LOC-1', context: 'Rédige une synthèse.' }),
        'repayment'
      )
    ).toEqual({ id_locataire: 'LOC-1', context: 'Rédige une synthèse.' })
    expect(
      parseWorkflowPayload(
        JSON.stringify({ id_locataire: 'LOC-1', year_from: 2020, year_to: 2026 }),
        'repayment'
      )
    ).toBeNull()
    expect(parseWorkflowPayload(JSON.stringify({ id_locataire: 'LOC-1' }), 'repayment')).toBeNull()
  })

  it('accepts a replies mission and rejects a repayment payload', () => {
    expect(
      parseWorkflowPayload(
        JSON.stringify({ id_reclamation: 'REQ-1', context: 'Rédige une réponse possible.' }),
        'replies'
      )
    ).toEqual({ id_reclamation: 'REQ-1', context: 'Rédige une réponse possible.' })
    expect(
      parseWorkflowPayload(
        JSON.stringify({ id_locataire: 'LOC-1', context: 'Rédige une synthèse.' }),
        'replies'
      )
    ).toBeNull()
  })

  it('injects the workflow payload once, through the marker or after the prompt', () => {
    expect(
      injectWorkflowPayload('Mission\n<!-- WORKFLOW_PAYLOAD_HERE -->', { id_locataire: 'LOC-1' })
    ).toBe('Mission\n{\n  "id_locataire": "LOC-1"\n}')
    expect(injectWorkflowPayload('Mission', { id_locataire: 'LOC-1', context: '' })).toBe(
      'Mission\n\n{\n  "id_locataire": "LOC-1"\n}'
    )
  })
})
