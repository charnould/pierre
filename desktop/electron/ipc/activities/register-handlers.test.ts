import { describe, expect, it } from 'bun:test'

import { activityQueryString } from './query-string'

describe('activities query string', () => {
  it('serializes author filters and omits renderer-only URL and false flags', () => {
    const query = new URLSearchParams(
      activityQueryString({
        url: 'https://pierre.test',
        auteurs: ['user:alice@example.test', 'user:bob@example.test'],
        inbox: false,
        limit: 500
      })
    )

    expect(query.get('auteurs')).toBe('user:alice@example.test,user:bob@example.test')
    expect(query.get('limit')).toBe('500')
    expect(query.has('url')).toBe(false)
    expect(query.has('inbox')).toBe(false)
  })
})
