import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import {
  getTicketBucketMeta,
  isTicketBucketId,
  resolveTicketBucket,
  ticketBucketIds
} from './ticket-bucket'

describe('ticket buckets', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('follows customization order and labels', () => {
    expect(ticketBucketIds()).toEqual(['non_traitees'])
    expect(getTicketBucketMeta('non_traitees').label).toBe('Réclamations')
  })

  test('falls back to the system bucket', () => {
    expect(isTicketBucketId('non_traitees')).toBe(true)
    expect(isTicketBucketId('en_cours')).toBe(false)
    expect(isTicketBucketId('ancien')).toBe(false)
    expect(resolveTicketBucket('ancien')).toBe('non_traitees')
    expect(resolveTicketBucket(undefined)).toBe('non_traitees')
  })
})
