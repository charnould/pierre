import { describe, expect, test } from 'bun:test'

import { jsonSyntaxError, TICKETS_JSON_EXAMPLE } from './setup-json'

describe('jsonSyntaxError', () => {
  test('rejects text that is not JSON', () => {
    expect(jsonSyntaxError('un truc')).toBe('JSON invalide.')
    expect(jsonSyntaxError('')).toBe('JSON invalide.')
  })

  test('accepts the minimal tickets document', () => {
    expect(jsonSyntaxError(TICKETS_JSON_EXAMPLE)).toBeNull()
  })
})
