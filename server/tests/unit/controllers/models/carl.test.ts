import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/models/carl'
import {
  applyNulls,
  decodeLogits,
  legalize,
  normalize,
  padTokens,
  type CarlLabels,
  type Mention
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

  it('forces nulls for hors_demande and inexploitable', () => {
    const filled: Mention = {
      niveau_1: 'hors_demande',
      niveau_2: 'eau',
      niveau_3: 'fuite',
      urgence: 'immediat',
      danger_personnes: 'avere',
      lieu: 'privatif',
      registre: 'agressif'
    }
    expect(applyNulls(filled).registre).toBeNull()
    expect(applyNulls({ ...filled, niveau_1: 'inexploitable' }).registre).toBe('agressif')
    expect(applyNulls({ ...filled, niveau_1: 'inexploitable' }).urgence).toBeNull()
  })

  it('reads the motif and the side heads', () => {
    const labels: CarlLabels = {
      motif: [
        ['hors_demande', 'null', 'null'],
        ['technique', 'eau', 'fuite']
      ],
      urgence: ['null', 'dans_la_journee'],
      danger_personnes: ['null', 'aucun'],
      lieu: ['null', 'privatif'],
      registre: ['null', 'standard']
    }
    const zeros = (index: number, size: number) => {
      const values = new Float32Array(size)
      values[index] = 1
      return values
    }
    expect(
      decodeLogits(labels, [zeros(1, 2), zeros(1, 2), zeros(1, 2), zeros(1, 2), zeros(1, 2)])
    ).toEqual({
      niveau_1: 'technique',
      niveau_2: 'eau',
      niveau_3: 'fuite',
      urgence: 'dans_la_journee',
      danger_personnes: 'aucun',
      lieu: 'privatif',
      registre: 'standard'
    })
  })

  it('raises an illegal urgency back to the motif floor', () => {
    const labels: CarlLabels = {
      motif: [['technique', 'eau', 'fuite']],
      urgence: ['sous_quelques_jours', 'dans_la_journee'],
      danger_personnes: ['aucun'],
      lieu: ['privatif'],
      registre: ['null', 'standard'],
      plancher: [
        {
          urgence: 'dans_la_journee',
          danger: 'aucun',
          monte: ['immediat', 'potentiel', 'avere']
        }
      ]
    }
    const mention: Mention = {
      niveau_1: 'technique',
      niveau_2: 'eau',
      niveau_3: 'fuite',
      urgence: 'sous_quelques_jours',
      danger_personnes: 'aucun',
      lieu: 'privatif',
      registre: null
    }
    expect(legalize(labels, mention)).toEqual({
      ...mention,
      urgence: 'dans_la_journee',
      registre: 'standard'
    })
  })
})
