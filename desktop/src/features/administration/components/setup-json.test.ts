import { describe, expect, test } from 'bun:test'

import { jsonSyntaxError, TICKETS_JSON_EXAMPLE, ticketsConfigOrExample } from './setup-json'

describe('jsonSyntaxError', () => {
  test('rejects text that is not JSON', () => {
    expect(jsonSyntaxError('un truc')).toBe('JSON invalide.')
    expect(jsonSyntaxError('')).toBe('JSON invalide.')
  })

  test('accepts the minimal tickets document', () => {
    expect(jsonSyntaxError(TICKETS_JSON_EXAMPLE)).toBeNull()
  })
})

describe('ticketsConfigOrExample', () => {
  test('replaces text that gx would refuse', () => {
    expect(ticketsConfigOrExample('un truc')).toBe(TICKETS_JSON_EXAMPLE)
    expect(ticketsConfigOrExample('')).toBe(TICKETS_JSON_EXAMPLE)
    expect(ticketsConfigOrExample('{"buckets":[{"id":"autre","label":"Autre"}]}')).toBe(
      TICKETS_JSON_EXAMPLE
    )
    expect(
      ticketsConfigOrExample(
        '{"buckets":[{"id":"non_traitees","label":"Réclamations"}],"actions":{"dossier":["Faire"]},"tags":["Urgent"],"prompt":"consigne"}'
      )
    ).toBe(TICKETS_JSON_EXAMPLE)
  })

  test('keeps a document that already has the required shape', () => {
    const custom = `{
      "buckets": [{ "id": "non_traitees", "label": "Demandes" }, { "id": "suite", "label": "Suite" }],
      "actions": { "dossier": ["Analyser"] },
      "tags": ["Urgent"]
    }`
    expect(ticketsConfigOrExample(custom)).toBe(custom)
    expect(ticketsConfigOrExample(TICKETS_JSON_EXAMPLE)).toBe(TICKETS_JSON_EXAMPLE)
  })
})
