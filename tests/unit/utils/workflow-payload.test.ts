import { describe, expect, it } from 'bun:test'

import {
  formatWorkflowPrompt,
  parseWorkflowPayload,
  resolveAnswerPrompt
} from '../../../utils/workflow-payload'

describe('workflow-payload', () => {
  it('formate un payload answer mode message', () => {
    const prompt = formatWorkflowPrompt({
      version: 1,
      workflow: 'answer',
      mode: 'message',
      id_request: null,
      id_locataire: '187329',
      message: 'Bonjour',
      contexte: 'Relance'
    })
    expect(prompt).toContain('"mode": "message"')
    expect(prompt).toContain('"id_locataire": "187329"')
    expect(prompt).toContain('## Consignes')
  })

  it('formate un payload synthese', () => {
    const prompt = formatWorkflowPrompt({
      version: 1,
      workflow: 'synthese',
      about_subject: 'locataire',
      identifiant: '187329',
      year_from: 2017
    })
    expect(prompt).toContain('"workflow": "synthese"')
    expect(prompt).toContain('"year_from": 2017')
  })

  it('resolveAnswerPrompt utilise le payload si valide', () => {
    const payload = JSON.stringify({
      version: 1,
      workflow: 'answer',
      mode: 'affaire',
      id_request: 'REQ-1',
      id_locataire: null,
      message: null,
      contexte: null
    })
    const prompt = resolveAnswerPrompt(payload, '', '')
    expect(prompt).toContain('Données structurées')
    expect(prompt).toContain('REQ-1')
  })

  it('resolveAnswerPrompt retombe sur legacy', () => {
    const prompt = resolveAnswerPrompt(null, 'Hello', 'Notes')
    expect(prompt).toContain('# Message du locataire')
    expect(prompt).toContain('Hello')
  })

  it('parseWorkflowPayload rejette answer incomplet', () => {
    expect(
      parseWorkflowPayload(
        JSON.stringify({
          version: 1,
          workflow: 'answer',
          mode: 'message',
          id_locataire: '',
          message: ''
        })
      )
    ).toBeNull()
  })
})
