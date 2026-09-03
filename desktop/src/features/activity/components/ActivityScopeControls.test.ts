import { describe, expect, test } from 'bun:test'

import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'

import {
  activityAuthorKey,
  followedPeopleCount,
  selectAuthoredActivityItems
} from './ActivityScopeControls'

function item(
  source: ActivityNotificationItem['source'],
  sender: string
): ActivityNotificationItem {
  return {
    id: sender,
    type: 'repayment',
    source,
    ref: 'LOC-1',
    sender,
    body: `${sender} a agi`,
    createdAt: '2026-09-17T10:00:00.000Z',
    isRead: true,
    boosts: {},
    target: { view: 'repayment', tenantId: 'LOC-1' },
    contextLabel: 'LOC-1',
    moduleLabel: 'Impayés',
    notificationId: sender
  }
}

describe('followedPeopleCount', () => {
  test('counts self and collaborators without double-counting', () => {
    expect(
      followedPeopleCount(
        { showOwnActivity: false, followedActivityAuthors: [] },
        'alice@example.test'
      )
    ).toBe(0)
    expect(
      followedPeopleCount(
        { showOwnActivity: true, followedActivityAuthors: [] },
        'alice@example.test'
      )
    ).toBe(1)
    expect(
      followedPeopleCount(
        {
          showOwnActivity: true,
          followedActivityAuthors: ['user:alice@example.test', 'user:bob@example.test']
        },
        'alice@example.test'
      )
    ).toBe(2)
    expect(activityAuthorKey(' Alice@Example.test ')).toBe('user:alice@example.test')
  })
})

describe('selectAuthoredActivityItems', () => {
  test('keeps followed collaborators and own activity when enabled', () => {
    const mention = item('mention', 'bob@example.test')
    const followed = item('activity', 'bob@example.test')
    const own = item('activity', 'alice@example.test')
    const stranger = item('activity', 'claire@example.test')
    const selected = selectAuthoredActivityItems(
      [mention, followed, own, stranger],
      'alice@example.test',
      {
        followedActivityAuthors: ['user:bob@example.test'],
        showOwnActivity: true
      }
    )
    expect(selected.map((entry) => entry.sender)).toEqual([
      'bob@example.test',
      'alice@example.test'
    ])
  })
})
