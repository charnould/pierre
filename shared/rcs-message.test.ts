import { describe, expect, test } from 'bun:test'

import {
  empty_rcs_compose,
  parse_choice,
  parse_choices,
  parse_rcs_contenu,
  parse_stored_choices,
  rcs_compose_payload,
  rcs_compose_ready,
  with_sms_fallback
} from './rcs-message'

describe('parse_choice', () => {
  test('accepte réponse, appel, lien https et ignore le surplus', () => {
    expect(parse_choice({ type: 'reply', label: 'Rappelez-moi' })).toEqual({
      type: 'reply',
      label: 'Rappelez-moi'
    })
    expect(parse_choice({ type: 'dial', label: 'Appeler', phone: '+33123456789' })).toEqual({
      type: 'dial',
      label: 'Appeler',
      phone: '+33123456789'
    })
    expect(
      parse_choice({ type: 'url', label: 'Espace client', url: 'https://bailleur.fr' })
    ).toEqual({
      type: 'url',
      label: 'Espace client',
      url: 'https://bailleur.fr'
    })
    expect(parse_choice({ type: 'reply', label: 'Trop long pour un bouton RCS !!' })).toBeNull()
    expect(parse_choice({ type: 'reply', id: 'x', label: 'Oui' })).toEqual({
      type: 'reply',
      label: 'Oui'
    })
    expect(parse_choice({ id: 'rappeler', label: 'Être rappelé' })).toBeNull()
    expect(parse_choice({ type: 'email', label: 'Écrire', email: 'a@b.fr' })).toBeNull()
    expect(parse_choice({ type: 'location', label: 'Agence', query: '12 rue' })).toBeNull()
    expect(parse_choice({ type: 'url', label: 'Lien', url: 'http://example.fr' })).toBeNull()
    expect(
      parse_choice({ type: 'url', label: 'Mail', url: 'mailto:recouvrement@bailleur.fr' })
    ).toBeNull()
    expect(parse_choice({ type: 'url', label: 'Lien', url: 'https:foo' })).toBeNull()
  })
})

describe('parse_choices', () => {
  test('undefined est une liste vide, null et le gras sont invalides', () => {
    expect(parse_choices(undefined)).toEqual([])
    expect(parse_choices(null)).toBeNull()
    expect(parse_choices([{ type: 'reply', label: 'Oui' }])).toEqual([
      { type: 'reply', label: 'Oui' }
    ])
    expect(
      parse_choices([
        { type: 'reply', label: 'Oui' },
        { type: 'reply', label: 'Oui' }
      ])
    ).toBeNull()
    expect(
      parse_choices(
        Array.from({ length: 12 }, (_, index) => ({ type: 'reply', label: `B${index}` }))
      )
    ).toBeNull()
  })
})

describe('parse_stored_choices', () => {
  test('lit l’historique hors limites d’envoi', () => {
    expect(parse_stored_choices(undefined)).toEqual([])
    expect(parse_stored_choices(null)).toBeNull()
    expect(parse_stored_choices(['Être rappelé'])).toBeNull()
    expect(parse_stored_choices([{ id: 'rappeler', label: 'Être rappelé' }])).toEqual([
      { type: 'reply', label: 'Être rappelé' }
    ])
    expect(parse_stored_choices([{ type: 'reply', label: 'Transmettre le justificatif' }])).toEqual(
      [{ type: 'reply', label: 'Transmettre le justificatif' }]
    )
    expect(
      parse_stored_choices([
        { type: 'reply', label: 'Oui' },
        { type: 'reply', label: 'Oui' }
      ])
    ).toEqual([
      { type: 'reply', label: 'Oui' },
      { type: 'reply', label: 'Oui' }
    ])
    expect(
      parse_stored_choices(
        Array.from({ length: 12 }, (_, index) => ({ type: 'reply', label: `B${index}` }))
      )
    ).toHaveLength(12)
    expect(
      parse_stored_choices([{ type: 'url', label: 'Lien', url: 'http://example.fr' }])
    ).toEqual([{ type: 'url', label: 'Lien', url: 'http://example.fr' }])
  })
})

describe('parse_rcs_contenu', () => {
  test('exige un body, garde le SMS optionnel et ignore le sidecar journal', () => {
    expect(
      parse_rcs_contenu({
        body: 'RCS',
        sms_fallback: 'SMS',
        choices: [
          { type: 'reply', label: 'Oui' },
          { type: 'reply', label: 'Oui' }
        ]
      })
    ).toBeNull()
    expect(parse_rcs_contenu({ body: 'RCS' })).toEqual({
      body: 'RCS',
      choices: []
    })
    expect(parse_rcs_contenu({ body: '', sms_fallback: 'SMS', choices: [] })).toBeNull()
    expect(
      parse_rcs_contenu({ body: 'RCS', choices: [{ id: 'rappeler', label: 'Être rappelé' }] })
    ).toBeNull()
    expect(
      parse_rcs_contenu({
        action: 'Relancer',
        body: 'RCS',
        sms_fallback: 'SMS',
        sender: 'alice@example.org',
        external_application: { name: 'Izy' },
        choices: [
          { type: 'reply', label: 'Oui' },
          { type: 'dial', label: 'Appeler', phone: '+33123456789' },
          { type: 'url', label: 'Site', url: 'https://bailleur.fr' }
        ]
      })
    ).toEqual({
      action: 'Relancer',
      body: 'RCS',
      sms_fallback: 'SMS',
      choices: [
        { type: 'reply', label: 'Oui' },
        { type: 'dial', label: 'Appeler', phone: '+33123456789' },
        { type: 'url', label: 'Site', url: 'https://bailleur.fr' }
      ]
    })
  })

  test('with_sms_fallback matérialise le SMS avec le body si besoin', () => {
    expect(with_sms_fallback({ body: 'RCS', choices: [] })).toEqual({
      body: 'RCS',
      sms_fallback: 'RCS',
      choices: []
    })
    expect(with_sms_fallback({ body: 'RCS', sms_fallback: 'SMS', choices: [] })).toEqual({
      body: 'RCS',
      sms_fallback: 'SMS',
      choices: []
    })
  })
})

describe('empty_rcs_compose', () => {
  test('préremplit le destinataire et laisse le reste vide', () => {
    expect(empty_rcs_compose('0611223344')).toEqual({
      destinataire: '0611223344',
      body: '',
      sms_fallback: '',
      choices: []
    })
  })
})

describe('rcs_compose_ready', () => {
  test('demande un destinataire et un body, pas un SMS distinct', () => {
    expect(
      rcs_compose_ready({ destinataire: '', body: 'RCS', sms_fallback: '', choices: [] })
    ).toBe(false)
    expect(
      rcs_compose_ready({ destinataire: '0611223344', body: 'RCS', sms_fallback: '', choices: [] })
    ).toBe(true)
    expect(
      rcs_compose_payload({
        destinataire: '0611223344',
        body: 'RCS',
        sms_fallback: '',
        choices: []
      })
    ).toEqual({
      destinataire: '0611223344',
      contenu: { body: 'RCS', sms_fallback: 'RCS', choices: [] }
    })
    expect(
      rcs_compose_ready({
        destinataire: '0611223344',
        body: 'RCS',
        sms_fallback: 'SMS',
        choices: [{ type: 'reply', label: '' }]
      })
    ).toBe(false)
  })
})
