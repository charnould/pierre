import { describe, expect, test } from 'bun:test'

import {
  getTicketBucketMeta,
  isTicketBucketId,
  resolveTicketBucket,
  TICKET_BUCKET_IDS
} from './ticket-bucket'

describe('ticket buckets', () => {
  test('follows customization order and labels', () => {
    expect(TICKET_BUCKET_IDS).toEqual(['non_traitees', 'en_cours', 'en_attente', 'cloturees'])
    expect(getTicketBucketMeta('cloturees').label).toBe('Clôturées')
  })

  test('falls back to the system bucket', () => {
    expect(isTicketBucketId('en_cours')).toBe(true)
    expect(isTicketBucketId('ancien')).toBe(false)
    expect(resolveTicketBucket('ancien')).toBe('non_traitees')
    expect(resolveTicketBucket(undefined)).toBe('non_traitees')
  })
})
