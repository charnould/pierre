import { describe, expect, test } from 'bun:test'

import { parseResult, parseStreamingResult } from './parse-result'

const ARTIFACT_SAMPLE = `<artifact name="analysis">
**Cas** — recouvrement
</artifact>
<artifact name="response">
Madame, Monsieur, bonjour.
</artifact>`

describe('parseResult', () => {
  test('extracts artifact analysis and response', () => {
    expect(parseResult(ARTIFACT_SAMPLE)).toEqual({
      analysis: '**Cas** — recouvrement',
      response: 'Madame, Monsieur, bonjour.'
    })
  })

  test('returns empty strings when no artifacts', () => {
    expect(parseResult('texte brut')).toEqual({
      analysis: '',
      response: ''
    })
  })

  test('returns empty response when only analysis artifact', () => {
    expect(parseResult('<artifact name="analysis">seul</artifact>')).toEqual({
      analysis: 'seul',
      response: ''
    })
  })
})

describe('parseStreamingResult', () => {
  test('returns empty when no artifacts', () => {
    expect(parseStreamingResult('Synthèse locataire…')).toEqual({
      analysis: '',
      response: ''
    })
  })

  test('partial artifact analysis before closing tag', () => {
    const raw = '<artifact name="analysis">partiel'
    expect(parseStreamingResult(raw)).toEqual({
      analysis: 'partiel',
      response: ''
    })
  })

  test('open artifact response without close', () => {
    const raw = `<artifact name="analysis">ok</artifact>
<artifact name="response">en cours`
    expect(parseStreamingResult(raw)).toEqual({
      analysis: 'ok',
      response: 'en cours'
    })
  })
})
