import { describe, expect, test } from 'bun:test'

import type { UpdateEntry } from '@/features/updates/types'

import {
  countUnread,
  filterEntriesByScope,
  isUpdateEntryUnread,
  latestUnreadEntry,
  markEntryRead,
  markEntryUnread,
  markScopeRead,
  resolveUpdatesReadSlugs
} from './updates-notification'

const entries: UpdateEntry[] = [
  {
    slug: '2026-06-15-desktop-alpha',
    title: 'Latest',
    date: '2026-06-15'
  },
  {
    slug: '2026-05-27-rag',
    title: 'Middle',
    date: '2026-05-27'
  },
  {
    slug: '2026-01-01-older',
    title: 'Older',
    date: '2026-01-01'
  }
]

describe('filterEntriesByScope', () => {
  test('off returns an empty list', () => {
    expect(filterEntriesByScope(entries, 'off')).toEqual([])
  })

  test('all keeps every entry', () => {
    expect(filterEntriesByScope(entries, 'all')).toHaveLength(3)
  })
})

describe('resolveUpdatesReadSlugs', () => {
  test('returns persisted slugs', () => {
    expect(resolveUpdatesReadSlugs(['a'])).toEqual(['a'])
  })

  test('returns empty when nothing was persisted', () => {
    expect(resolveUpdatesReadSlugs(undefined)).toEqual([])
  })
})

describe('countUnread', () => {
  test('returns zero when scope is off', () => {
    expect(countUnread(entries, 'off', undefined)).toBe(0)
  })

  test('counts all entries when nothing was read yet', () => {
    expect(countUnread(entries, 'all', undefined)).toBe(3)
  })

  test('counts only unread slugs', () => {
    expect(countUnread(entries, 'all', ['2026-05-27-rag'])).toBe(2)
  })

  test('returns zero when every entry was read', () => {
    expect(
      countUnread(entries, 'all', [
        '2026-06-15-desktop-alpha',
        '2026-05-27-rag',
        '2026-01-01-older'
      ])
    ).toBe(0)
  })
})

describe('latestUnreadEntry', () => {
  test('returns the newest unread entry', () => {
    expect(latestUnreadEntry(entries, 'all', ['2026-05-27-rag'])?.slug).toBe(
      '2026-06-15-desktop-alpha'
    )
  })

  test('returns null when there is nothing unread', () => {
    expect(
      latestUnreadEntry(entries, 'all', [
        '2026-06-15-desktop-alpha',
        '2026-05-27-rag',
        '2026-01-01-older'
      ])
    ).toBeNull()
  })
})

describe('isUpdateEntryUnread', () => {
  test('tracks each slug independently', () => {
    const read = ['2026-05-27-rag']
    expect(isUpdateEntryUnread(read, entries[0]!)).toBe(true)
    expect(isUpdateEntryUnread(read, entries[1]!)).toBe(false)
    expect(isUpdateEntryUnread(read, entries[2]!)).toBe(true)
  })
})

describe('markEntryRead', () => {
  test('appends slug without duplicates', () => {
    expect(markEntryRead(undefined, '2026-05-27-rag')).toEqual(['2026-05-27-rag'])
    expect(markEntryRead(['2026-05-27-rag'], '2026-05-27-rag')).toEqual(['2026-05-27-rag'])
    expect(markEntryRead(['2026-05-27-rag'], '2026-06-15-desktop-alpha')).toEqual([
      '2026-05-27-rag',
      '2026-06-15-desktop-alpha'
    ])
  })
})

describe('markEntryUnread', () => {
  test('removes a read slug and leaves others', () => {
    expect(
      markEntryUnread(['2026-05-27-rag', '2026-06-15-desktop-alpha'], '2026-05-27-rag')
    ).toEqual(['2026-06-15-desktop-alpha'])
  })

  test('is a no-op when the slug was not read', () => {
    expect(markEntryUnread(['2026-05-27-rag'], '2026-06-15-desktop-alpha')).toEqual([
      '2026-05-27-rag'
    ])
    expect(markEntryUnread(undefined, '2026-05-27-rag')).toEqual([])
  })
})

describe('markScopeRead', () => {
  test('marks every entry as read when scope is all', () => {
    expect(markScopeRead(entries, 'all', undefined)).toEqual([
      '2026-06-15-desktop-alpha',
      '2026-05-27-rag',
      '2026-01-01-older'
    ])
  })
})
