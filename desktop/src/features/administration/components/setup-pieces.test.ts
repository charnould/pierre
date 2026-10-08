import { describe, expect, test } from 'bun:test'

import { setupPieces } from './setup-pieces'

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
      [true, 'Configuration enregistrée'],
      [true, 'Consigne enregistrée'],
      [false, 'Déposer l’icône SVG']
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

  test('requires both email placeholders, the logo, and declared repayment templates', () => {
    expect(
      setupPieces('email', { 'email/html': '<p>Bonjour</p>' }, []).map((item) => item.done)
    ).toEqual([false, false])
    expect(
      setupPieces('email', { 'email/html': '{{ logo_inline_cid }} {{ message }}' }, [
        'email/logo.png'
      ]).every((item) => item.done)
    ).toBe(true)

    expect(
      setupPieces('repayment', { repayment: JSON.stringify({ templates: ['note.md'] }) }, [
        'repayment/template.docx'
      ]).map((item) => item.label)
    ).toEqual([
      'Configuration enregistrée',
      'Enregistrer la consigne',
      'Modèle de document déposé',
      'Enregistrer le modèle note.md'
    ])
  })

  test('lists the remaining entries', () => {
    expect(setupPieces('global', {}, []).map((item) => item.label)).toEqual([
      'Enregistrer la configuration'
    ])
    expect(setupPieces('tickets', {}, []).map((item) => item.id)).toEqual([
      'tickets',
      'tickets/AGENTS.md',
      'tickets/letter.docx'
    ])
    expect(setupPieces('about/AGENTS.md', { 'about/AGENTS.md': 'Synthèse.' }, [])[0]?.done).toBe(
      true
    )
    expect(setupPieces('automations/AGENTS.md', {}, [])[0]?.label).toBe('Enregistrer la consigne')
  })
})
