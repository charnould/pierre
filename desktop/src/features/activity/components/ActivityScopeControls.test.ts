import { describe, expect, test } from 'bun:test'

import { activityAuthorKey, followedPeopleCount } from './ActivityScopeControls'

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
