import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { canonicalizeTicketTags, sameTicketTagSet, ticketTagOptions } from './ticket-tags'

describe('ticket tags', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('uses the closed customization list', () => {
    expect(ticketTagOptions()).toContain('Sécurité des personnes')
    expect(ticketTagOptions()).toContain('Attente prestataire')
    expect(canonicalizeTicketTags(['Libre', 'Urgent'])).toEqual(['Urgent'])
  })

  test('compares selections in customization order', () => {
    expect(sameTicketTagSet(['Urgent', 'Insalubrité'], ['Insalubrité', 'Urgent'])).toBe(true)
  })
})
