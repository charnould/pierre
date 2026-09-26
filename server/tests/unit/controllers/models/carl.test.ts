import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/models/carl'
import {
  decodeLogits,
  legalize,
  normalize,
  padTokens,
  type CarlLabels
} from '../../../../utils/carl'

const app = new Hono()
app.post('/api/models/carl', controller)

describe('POST /api/models/carl', () => {
  it('rejects a body that is not JSON', async () => {
    const response = await app.request('/api/models/carl', { method: 'POST', body: 'non' })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'invalid', message: 'Corps JSON attendu.' }
    })
  })

  it('rejects an empty text', async () => {
    const response = await app.request('/api/models/carl', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texte: '   ' })
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'invalid', message: 'Texte vide.' }
    })
  })

  it('rejects a missing text', async () => {
    const response = await app.request('/api/models/carl', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'invalid', message: 'Texte vide.' }
    })
  })
})

describe('carl tokens', () => {
  it('sends the message length and caps at 128', () => {
    const short = padTokens([1, 2, 3], 0)
    expect(short.inputIds.length).toBe(3)
    expect(short.attentionMask.every((bit) => bit === 1n)).toBe(true)
    const long = padTokens(
      Array.from({ length: 200 }, (_, index) => index),
      0
    )
    expect(long.inputIds.length).toBe(128)
    expect(long.inputIds[127]).toBe(127n)
    expect(long.attentionMask.every((bit) => bit === 1n)).toBe(true)
    const empty = padTokens([], 9)
    expect([...empty.inputIds]).toEqual([9n])
    expect([...empty.attentionMask]).toEqual([0n])
  })
})

describe('carl labels', () => {
  it('folds the text the way the training set does', () => {
    expect(normalize("Fuite d'eau, réduction")).toBe('fuite d eau, reduction')
  })

  const predicted = {
    integrite_physique: 'intacte',
    lieu: 'logement',
    obligation_reglementaire: 'bailleur',
    ton: 'agressif'
  }

  it('forces sans_objet on a special code and keeps the tone', () => {
    expect(legalize('inexploitable', predicted)).toEqual({
      domaine: 'inexploitable',
      sous_domaine: 'sans_objet',
      motif: 'sans_objet',
      integrite_physique: 'sans_objet',
      lieu: 'sans_objet',
      obligation_reglementaire: 'sans_objet',
      ton: 'agressif'
    })
  })

  it('clears the obligation outside technique', () => {
    expect(legalize('administratif.bail.copie', predicted).obligation_reglementaire).toBe(
      'sans_objet'
    )
  })

  it('keeps the predicted obligation for technique', () => {
    expect(legalize('technique.menuiserie.volet_defectueux', predicted)).toEqual({
      domaine: 'technique',
      sous_domaine: 'menuiserie',
      motif: 'volet_defectueux',
      ...predicted
    })
  })

  it('reads the code and the side heads', () => {
    const labels: CarlLabels = {
      code: ['hors_perimetre', 'technique.menuiserie.volet_defectueux'],
      integrite_physique: ['menacee', 'intacte'],
      lieu: ['indetermine', 'logement'],
      obligation_reglementaire: ['locataire', 'bailleur'],
      ton: ['insatisfait', 'neutre']
    }
    const zeros = (index: number, size: number) => {
      const values = new Float32Array(size)
      values[index] = 1
      return values
    }
    expect(
      decodeLogits(labels, [zeros(1, 2), zeros(1, 2), zeros(1, 2), zeros(1, 2), zeros(1, 2)])
    ).toEqual({
      domaine: 'technique',
      sous_domaine: 'menuiserie',
      motif: 'volet_defectueux',
      integrite_physique: 'intacte',
      lieu: 'logement',
      obligation_reglementaire: 'bailleur',
      ton: 'neutre'
    })
  })
})
