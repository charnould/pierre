import { describe, expect, test } from 'bun:test'

import {
  buildAnswerPayload,
  buildSynthesePayload,
  serializeWorkflowPayload,
  WORKFLOW_PAYLOAD_VERSION
} from './workflow-payload'

describe('buildSynthesePayload', () => {
  test('builds synthese payload with trimmed identifiant', () => {
    expect(
      buildSynthesePayload({
        about_subject: 'locataire',
        identifiant: '  LOC-187329  ',
        year_from: 2018,
        year_to: 2024,
        context: '  Notes  '
      })
    ).toEqual({
      version: WORKFLOW_PAYLOAD_VERSION,
      workflow: 'synthese',
      about_subject: 'locataire',
      identifiant: 'LOC-187329',
      year_from: 2018,
      year_to: 2024,
      context: 'Notes'
    })
  })

  test('omits empty context', () => {
    expect(
      buildSynthesePayload({
        about_subject: 'locataire',
        identifiant: 'LOC-1',
        year_from: 2000,
        year_to: 2029,
        context: '   '
      }).context
    ).toBe(null)
  })

  test('supports lot and programme subjects', () => {
    expect(
      buildSynthesePayload({
        about_subject: 'lot',
        identifiant: 'LOT-1',
        year_from: 2000,
        year_to: 2010,
        context: ''
      }).about_subject
    ).toBe('lot')

    expect(
      buildSynthesePayload({
        about_subject: 'programme',
        identifiant: 'PRG-1',
        year_from: 2020,
        year_to: 2029,
        context: ''
      }).about_subject
    ).toBe('programme')
  })
})

describe('serializeWorkflowPayload', () => {
  test('serializes synthese payloads as JSON', () => {
    const payload = buildSynthesePayload({
      about_subject: 'locataire',
      identifiant: 'LOC-1',
      year_from: 2005,
      year_to: 2015,
      context: ''
    })
    expect(serializeWorkflowPayload(payload)).toBe(JSON.stringify(payload))
  })

  test('serializes answer payloads with channel as JSON', () => {
    const payload = buildAnswerPayload({
      id_reclamation: 'REQ-1',
      id_locataire: 'LOC-1',
      message: 'Bonjour',
      context: '',
      channel: 'letter'
    })
    expect(payload).toEqual({
      version: WORKFLOW_PAYLOAD_VERSION,
      workflow: 'answer',
      id_reclamation: 'REQ-1',
      id_locataire: 'LOC-1',
      message: 'Bonjour',
      context: null,
      channel: 'letter'
    })
    expect(serializeWorkflowPayload(payload)).toBe(JSON.stringify(payload))
  })

  test('includes all non-empty answer fields', () => {
    expect(
      buildAnswerPayload({
        id_reclamation: 'REQ-1',
        id_locataire: 'LOC-1',
        message: 'Bonjour',
        context: 'Notes'
      })
    ).toMatchObject({
      id_reclamation: 'REQ-1',
      id_locataire: 'LOC-1',
      message: 'Bonjour',
      context: 'Notes'
    })
  })
})
