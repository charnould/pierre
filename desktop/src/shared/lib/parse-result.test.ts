import { describe, expect, test } from 'bun:test'

import { parseWorkflowStream, TICKET_ANSWER_SKILL } from './parse-result'

const TICKET_SAMPLE = `<artifact name="subject">Objet du courrier</artifact>
Madame, Monsieur, bonjour.`

describe('parseWorkflowStream ticket.answer-ticket', () => {
  test('extracts subject and body', () => {
    expect(parseWorkflowStream(TICKET_SAMPLE, TICKET_ANSWER_SKILL)).toEqual({
      output: 'Madame, Monsieur, bonjour.',
      subject: 'Objet du courrier',
      raw: TICKET_SAMPLE
    })
  })

  test('streaming without close tag', () => {
    const raw = `<artifact name="subject">Objet</artifact>\nEn cours`
    expect(parseWorkflowStream(raw, TICKET_ANSWER_SKILL, true)).toEqual({
      output: 'En cours',
      subject: 'Objet',
      raw
    })
  })

  test('strips analysis preamble before subject artifact', () => {
    const raw = `Je vais d'abord interroger la base de données.
J'ai maintenant toutes les informations nécessaires. Voici la réponse générée :
---
<artifact name="subject">Objet du courrier</artifact>
Madame, Monsieur, bonjour.`
    expect(parseWorkflowStream(raw, TICKET_ANSWER_SKILL)).toEqual({
      output: 'Madame, Monsieur, bonjour.',
      subject: 'Objet du courrier',
      raw
    })
  })

  test('streaming hides body until subject artifact is closed', () => {
    const raw = `Analyse en cours…
<artifact name="subject">Objet</artifact>
Madame`
    expect(parseWorkflowStream(raw, TICKET_ANSWER_SKILL, true)).toEqual({
      output: 'Madame',
      subject: 'Objet',
      raw
    })
  })

  test('streaming hides preamble before subject artifact opens', () => {
    const raw = `Je vais interroger la base.`
    expect(parseWorkflowStream(raw, TICKET_ANSWER_SKILL, true)).toEqual({
      output: '',
      subject: '',
      raw
    })
  })
})

describe('parseWorkflowStream plain skills', () => {
  test('returns trimmed markdown for about.summary', () => {
    expect(parseWorkflowStream('# Synthèse\n\nContenu.', 'about.summary')).toEqual({
      output: '# Synthèse\n\nContenu.',
      subject: '',
      raw: '# Synthèse\n\nContenu.'
    })
  })

  test('strips unknown artifact tags', () => {
    const input = `<artifact name="output">Note interne</artifact>`
    expect(parseWorkflowStream(input, 'ticket.write-memo').output).toBe('')
  })
})
