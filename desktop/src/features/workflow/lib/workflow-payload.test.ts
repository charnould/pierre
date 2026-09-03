import { describe, expect, test } from 'bun:test'

import { buildSynthesePayload, serializeWorkflowPayload } from './workflow-payload'

describe('buildSynthesePayload', () => {
  test('builds synthese payload with trimmed id', () => {
    expect(
      buildSynthesePayload({
        about_subject: 'locataire',
        identifiant: '  121284  ',
        year_from: 2000,
        year_to: 2029,
        context: '  Notes  '
      })
    ).toEqual({
      id_locataire: '121284',
      year_from: 2000,
      year_to: 2029,
      context: 'Notes'
    })
  })

  test('omits empty context', () => {
    expect(
      buildSynthesePayload({
        about_subject: 'locataire',
        identifiant: '121284',
        year_from: 2000,
        year_to: 2029,
        context: '   '
      })
    ).toEqual({
      id_locataire: '121284',
      year_from: 2000,
      year_to: 2029
    })
  })

  test('maps each subject to its id key', () => {
    expect(
      buildSynthesePayload({
        about_subject: 'client',
        identifiant: 'CLI-1',
        year_from: 2000,
        year_to: 2010,
        context: ''
      })
    ).toEqual({ id_client: 'CLI-1', year_from: 2000, year_to: 2010 })

    expect(
      buildSynthesePayload({
        about_subject: 'lot',
        identifiant: 'LOT-1',
        year_from: 2000,
        year_to: 2010,
        context: ''
      })
    ).toEqual({ id_lot: 'LOT-1', year_from: 2000, year_to: 2010 })

    expect(
      buildSynthesePayload({
        about_subject: 'batiment',
        identifiant: 'BAT-1',
        year_from: 2020,
        year_to: 2029,
        context: ''
      })
    ).toEqual({ id_batiment: 'BAT-1', year_from: 2020, year_to: 2029 })
  })
})

describe('serializeWorkflowPayload', () => {
  test('serializes synthese payloads as JSON', () => {
    const payload = buildSynthesePayload({
      about_subject: 'locataire',
      identifiant: '121284',
      year_from: 2000,
      year_to: 2029,
      context: ''
    })
    expect(serializeWorkflowPayload(payload)).toBe(JSON.stringify(payload))
  })
})
