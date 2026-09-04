import { describe, expect, test } from 'bun:test'

import { canonicalizeTicketTags, sameTicketTagSet, TICKET_TAG_OPTIONS } from './ticket-tags'

describe('ticket tags', () => {
  test('uses the closed customization list', () => {
    expect(TICKET_TAG_OPTIONS).toContain('Sécurité des personnes')
    expect(TICKET_TAG_OPTIONS).toContain('Attente prestataire')
    expect(canonicalizeTicketTags(['Libre', 'Urgent'])).toEqual(['Urgent'])
  })

  test('compares selections in customization order', () => {
    expect(sameTicketTagSet(['Urgent', 'Insalubrité'], ['Insalubrité', 'Urgent'])).toBe(true)
  })
})
