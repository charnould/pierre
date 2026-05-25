import { describe, expect, it } from 'bun:test'

import { resolveTicketUrl } from './ticket-url'

describe('resolveTicketUrl', () => {
  it('substitutes request id placeholder in absolute template', () => {
    expect(
      resolveTicketUrl(
        'AFF-42',
        'https://mon.erp.com/eOEORO4OTZO35/reclamation?id={id_reclamation}'
      )
    ).toBe('https://mon.erp.com/eOEORO4OTZO35/reclamation?id=AFF-42')
  })

  it('encodes request id characters', () => {
    expect(resolveTicketUrl('a/b', 'https://erp.example.com/requests/{id_reclamation}')).toBe(
      'https://erp.example.com/requests/a%2Fb'
    )
  })
})
