import { describe, expect, test } from 'bun:test'

import {
  parseRepaymentMessage,
  parseRepaymentMessages,
  RepaymentMessageError
} from '../../../utils/repayment-messages'

const rcs = JSON.stringify({
  group: 'RCS',
  action: 'Relancer',
  label: 'Relance',
  body: 'Bonjour.',
  choices: [{ type: 'reply', label: 'Oui' }]
})

const locataire = `---
group: Courriel
action: Relancer
to: locataire
label: Relance
subject: Objet
---
Corps`

const caf = `---
group: CAF
action: Contacter la CAF
to: caf
label: Quittances
subject: Objet
email: caf@example.fr
---
Corps`

describe('repayment messages', () => {
  test('reads a complete RCS json and a complete markdown email', () => {
    expect(parseRepaymentMessage(rcs).kind).toBe('rcs')
    expect(parseRepaymentMessage(locataire)).toMatchObject({
      kind: 'email',
      to: 'locataire',
      email: null
    })
    expect(parseRepaymentMessage(caf)).toMatchObject({
      kind: 'email',
      to: 'caf',
      email: 'caf@example.fr'
    })
  })

  test('rejects an unknown key, a duplicate label and an empty collection', () => {
    expect(() =>
      parseRepaymentMessage(rcs.replace('"group"', '"channel": "rcs", "group"'))
    ).toThrow(RepaymentMessageError)
    expect(() => parseRepaymentMessages(JSON.stringify([rcs, rcs]))).toThrow('en double')
    expect(() => parseRepaymentMessages('[]')).toThrow('requis')
  })
})
