import { describe, expect, test } from 'bun:test'

import {
  parseWorkflowStream,
  resolveDraftContent,
  serializeTicketAnswer,
  TICKET_ANSWER_SKILL
} from './parse-result'

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

  test('strips legacy output artifacts', () => {
    const input = `<artifact name="output">Note interne</artifact>`
    expect(parseWorkflowStream(input, 'ticket.write-memo').output).toBe('Note interne')
  })
})

describe('serializeTicketAnswer', () => {
  test('embeds subject artifact before body', () => {
    expect(serializeTicketAnswer({ subject: 'Objet', body: 'Corps' })).toBe(
      `<artifact name="subject">Objet</artifact>\nCorps`
    )
  })

  test('returns body only when subject empty', () => {
    expect(serializeTicketAnswer({ subject: '', body: 'Corps' })).toBe('Corps')
  })
})

describe('resolveDraftContent', () => {
  test('prefers edited_output', () => {
    expect(
      resolveDraftContent({
        generated_output: serializeTicketAnswer({ subject: 'A', body: 'gen' }),
        edited_output: serializeTicketAnswer({ subject: 'B', body: 'edit' })
      })
    ).toEqual({ body: 'edit', subject: 'B' })
  })

  test('falls back to generated_output', () => {
    expect(
      resolveDraftContent({
        generated_output: serializeTicketAnswer({ subject: 'A', body: 'gen' }),
        edited_output: null
      })
    ).toEqual({ body: 'gen', subject: 'A' })
  })
})
