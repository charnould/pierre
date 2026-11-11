import { describe, expect, test } from 'bun:test'

import { recordedPhrase, setupPieces } from './setup-pieces'

describe('setupPieces', () => {
  test('asks for the public icon until the svg is stored', () => {
    const pieces = setupPieces(
      'chatbots/default',
      {
        'chatbots/default': '{ "id": "default" }',
        'chatbots/default/AGENTS.md': 'Consigne du chatbot.'
      },
      [],
      'default'
    )

    expect(pieces.map((item) => [item.done, item.label])).toEqual([
      [true, 'Configuration'],
      [true, 'Prompt système'],
      [false, 'Icône']
    ])
  })

  test('ignores a blank value and skips the icon for an internal agent', () => {
    expect(
      setupPieces(
        'chatbots/default',
        { 'chatbots/default': '  ' },
        ['chatbots/icons/icon.svg'],
        'default'
      ).map((item) => item.done)
    ).toEqual([false, false, true])

    expect(
      setupPieces('chatbots/default', {}, ['chatbots/icons/icon.svg'], 'cadre').map(
        (item) => item.id
      )
    ).toEqual(['chatbots/cadre', 'chatbots/cadre/AGENTS.md'])
  })

  test('lists the four repayment documents and the messages piece', () => {
    const pieces = setupPieces(
      'repayment',
      { repayment: '{ "phases": [] }', 'repayment/messages': '[]' },
      ['repayment/plan.docx']
    )
    expect(pieces.map((item) => [item.done, item.label])).toEqual([
      [true, 'Configuration'],
      [false, 'Prompt système'],
      [true, 'Plan d’apurement'],
      [false, 'Protocole de cohésion sociale'],
      [false, 'Diagnostic social et financier'],
      [false, 'Courrier standard'],
      [true, 'Messages']
    ])
    expect(recordedPhrase('Messages')).toBe('Messages, enregistrés')
    expect(recordedPhrase('Courrier')).toBe('Courrier, enregistré')
    expect(recordedPhrase('Configuration')).toBe('Configuration, enregistrée')
    expect(recordedPhrase('Plan d’apurement')).toBe('Plan d’apurement, enregistré')
  })

  test('lists the remaining entries', () => {
    expect(setupPieces('tickets', {}, []).map((item) => item.id)).toEqual([
      'tickets',
      'tickets/AGENTS.md',
      'tickets/letter.docx'
    ])
    expect(setupPieces('about/AGENTS.md', { 'about/AGENTS.md': 'Synthèse.' }, [])[0]?.done).toBe(
      true
    )
    expect(setupPieces('automations/AGENTS.md', {}, [])[0]?.label).toBe('Prompt système')
  })
})
