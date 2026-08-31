import { describe, expect, it } from 'bun:test'

import { contactColumnKind } from '@/features/outreach/lib/channel-feasibility'

describe('contactColumnKind', () => {
  it('reconnaît email, téléphone et adresse', () => {
    expect(contactColumnKind('email_locataire')).toBe('email')
    expect(contactColumnKind('email_client')).toBe('email')
    expect(contactColumnKind('telephone_locataire')).toBe('telephone')
    expect(contactColumnKind('telephone_client')).toBe('telephone')
    expect(contactColumnKind('adresse')).toBe('address')
    expect(contactColumnKind('solde')).toBeNull()
  })
})
