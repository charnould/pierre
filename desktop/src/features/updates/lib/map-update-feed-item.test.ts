import { describe, expect, test } from 'bun:test'

import {
  mapUpdateEntryToFeedItem,
  mergeActivityFeedItems,
  updateFeedItemId
} from './map-update-feed-item'

describe('mapUpdateEntryToFeedItem', () => {
  const entry = {
    slug: '2026-06-15-building-a-desktop-app-alpha',
    title: 'Lancement alpha',
    date: '2026-06-15'
  }

  test('maps entry to feed item with unread state', () => {
    const item = mapUpdateEntryToFeedItem(entry, [])
    expect(item.id).toBe(updateFeedItemId(entry.slug))
    expect(item.type).toBe('updates')
    expect(item.source).toBe('update')
    expect(item.isRead).toBe(false)
    expect(item.body).toBe(entry.title)
    expect(item.sender).toBe('Pierre')
    expect(item.moduleLabel).toBe('Mises à jour')
    expect(item.target).toEqual({
      view: 'updates',
      slug: entry.slug,
      title: entry.title,
      date: entry.date
    })
  })

  test('marks read when slug is in readSlugs', () => {
    const item = mapUpdateEntryToFeedItem(entry, [entry.slug])
    expect(item.isRead).toBe(true)
  })
})

describe('mergeActivityFeedItems', () => {
  test('sorts by createdAt descending', () => {
    const mentions = [
      {
        id: 'm1',
        createdAt: '2026-06-10 10:00'
      }
    ] as Parameters<typeof mergeActivityFeedItems>[0]
    const updates = [
      {
        id: 'u1',
        createdAt: '2026-06-15T12:00:00'
      }
    ] as Parameters<typeof mergeActivityFeedItems>[1]

    const merged = mergeActivityFeedItems(mentions, updates)
    expect(merged.map((item) => item.id)).toEqual(['u1', 'm1'])
  })
})
