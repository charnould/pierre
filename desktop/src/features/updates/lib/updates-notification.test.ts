import { describe, expect, test } from 'bun:test'

import type { UpdateEntry } from '@/features/updates/types'

import {
  countUnread,
  filterEntriesByScope,
  isUpdateEntryUnread,
  latestUnreadEntry,
  markEntryRead,
  markScopeRead,
  markSeenSlug,
  resolveUpdatesReadSlugs
} from './updates-notification'

const entries: UpdateEntry[] = [
  {
    slug: '2026-06-15-product-alpha',
    title: 'Product latest',
    date: '2026-06-15',
    audience: 'product'
  },
  {
    slug: '2026-05-27-dev-rag',
    title: 'Dev article',
    date: '2026-05-27',
    audience: 'dev'
  },
  {
    slug: '2026-01-01-product-older',
    title: 'Product older',
    date: '2026-01-01',
    audience: 'product'
  }
]

describe('filterEntriesByScope', () => {
  test('off returns an empty list', () => {
    expect(filterEntriesByScope(entries, 'off')).toEqual([])
  })

  test('product keeps only product entries', () => {
    expect(filterEntriesByScope(entries, 'product').map((entry) => entry.slug)).toEqual([
      '2026-06-15-product-alpha',
      '2026-01-01-product-older'
    ])
  })

  test('all keeps every entry', () => {
    expect(filterEntriesByScope(entries, 'all')).toHaveLength(3)
  })
})

describe('resolveUpdatesReadSlugs', () => {
  test('prefers explicit read slugs', () => {
    expect(resolveUpdatesReadSlugs(entries, ['a'], '2026-05-27-dev-rag')).toEqual(['a'])
  })

  test('migrates legacy last seen slug to read slugs at and below frontier', () => {
    expect(resolveUpdatesReadSlugs(entries, undefined, '2026-05-27-dev-rag')).toEqual([
      '2026-05-27-dev-rag',
      '2026-01-01-product-older'
    ])
  })
})

describe('countUnread', () => {
  test('returns zero when scope is off', () => {
    expect(countUnread(entries, 'off', undefined)).toBe(0)
  })

  test('counts all relevant entries when nothing was read yet', () => {
    expect(countUnread(entries, 'product', undefined)).toBe(2)
    expect(countUnread(entries, 'all', undefined)).toBe(3)
  })

  test('counts only unread slugs in scope', () => {
    expect(countUnread(entries, 'all', ['2026-05-27-dev-rag'])).toBe(2)
    expect(countUnread(entries, 'product', ['2026-01-01-product-older'])).toBe(1)
  })

  test('returns zero when every scoped entry was read', () => {
    expect(
      countUnread(entries, 'product', ['2026-06-15-product-alpha', '2026-01-01-product-older'])
    ).toBe(0)
  })
})

describe('latestUnreadEntry', () => {
  test('returns the newest unread entry', () => {
    expect(latestUnreadEntry(entries, 'all', ['2026-05-27-dev-rag'])?.slug).toBe(
      '2026-06-15-product-alpha'
    )
  })

  test('returns null when there is nothing unread', () => {
    expect(
      latestUnreadEntry(entries, 'product', [
        '2026-06-15-product-alpha',
        '2026-01-01-product-older'
      ])
    ).toBeNull()
  })
})

describe('isUpdateEntryUnread', () => {
  test('tracks each slug independently', () => {
    const read = ['2026-05-27-dev-rag']
    expect(isUpdateEntryUnread(read, entries[0]!)).toBe(true)
    expect(isUpdateEntryUnread(read, entries[1]!)).toBe(false)
    expect(isUpdateEntryUnread(read, entries[2]!)).toBe(true)
  })
})

describe('markEntryRead', () => {
  test('appends slug without duplicates', () => {
    expect(markEntryRead(undefined, '2026-05-27-dev-rag')).toEqual(['2026-05-27-dev-rag'])
    expect(markEntryRead(['2026-05-27-dev-rag'], '2026-05-27-dev-rag')).toEqual([
      '2026-05-27-dev-rag'
    ])
    expect(markEntryRead(['2026-05-27-dev-rag'], '2026-06-15-product-alpha')).toEqual([
      '2026-05-27-dev-rag',
      '2026-06-15-product-alpha'
    ])
  })
})

describe('markScopeRead', () => {
  test('marks every scoped entry as read', () => {
    expect(markScopeRead(entries, 'product', undefined)).toEqual([
      '2026-06-15-product-alpha',
      '2026-01-01-product-older'
    ])
  })
})

describe('markSeenSlug', () => {
  test('returns the latest slug for the active scope', () => {
    expect(markSeenSlug(entries, 'product')).toBe('2026-06-15-product-alpha')
    expect(markSeenSlug(entries, 'all')).toBe('2026-06-15-product-alpha')
    expect(markSeenSlug(entries, 'off')).toBeUndefined()
  })
})
