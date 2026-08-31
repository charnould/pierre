import { describe, expect, test } from 'bun:test'

import type { ActiviteListItem } from '@/shared/types/activites'

import {
  ACTIVITY_PAGE_SIZE,
  appendUniqueActivityRows,
  pageIsFull,
  refreshWindowLimit
} from './activity-page'

function row(id: number): ActiviteListItem {
  return {
    id,
    date_creation: '2026-07-26T10:00:00.000Z',
    rattachement: 'tickets:REC-1',
    auteur: 'agent:alice',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: '',
    my: null
  }
}

describe('activity page helpers', () => {
  test('refresh window is at least one page and grows with the loaded list', () => {
    expect(refreshWindowLimit(0)).toBe(ACTIVITY_PAGE_SIZE)
    expect(refreshWindowLimit(20)).toBe(ACTIVITY_PAGE_SIZE)
    expect(refreshWindowLimit(75)).toBe(75)
  })

  test('a page is full only when the server filled the requested limit', () => {
    expect(pageIsFull(50, 50)).toBe(true)
    expect(pageIsFull(49, 50)).toBe(false)
    expect(pageIsFull(0, 50)).toBe(false)
  })

  test('appends unseen ids and keeps the previous array when nothing is new', () => {
    const first = [row(1), row(2)]
    const merged = appendUniqueActivityRows(first, [row(2), row(3)])
    expect(merged.map((entry) => entry.id)).toEqual([1, 2, 3])
    expect(appendUniqueActivityRows(first, [row(1), row(2)])).toBe(first)
  })
})
