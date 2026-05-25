import { afterEach, describe, expect, test } from 'bun:test'

import {
  clearUpdatesCache,
  fetchUpdateMarkdown,
  fetchUpdatesIndex,
  parseUpdatesIndex
} from './github-updates'

describe('parseUpdatesIndex', () => {
  test('filters invalid entries and sorts by date desc', () => {
    const entries = parseUpdatesIndex([
      { slug: 'b', title: 'B', date: '2026-01-01', audience: 'dev' },
      { slug: 'a', title: 'A', date: '2026-05-12', audience: 'dev' },
      { slug: 1, title: 'bad', date: '2026-05-12', audience: 'dev' }
    ])

    expect(entries).toEqual([
      { slug: 'a', title: 'A', date: '2026-05-12', audience: 'dev' },
      { slug: 'b', title: 'B', date: '2026-01-01', audience: 'dev' }
    ])
  })
})

describe('fetchUpdatesIndex', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    clearUpdatesCache()
  })

  test('loads and caches index from github', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response(
        JSON.stringify([{ slug: 'a', title: 'A', date: '2026-05-12', audience: 'dev' }]),
        { status: 200 }
      )
    }) as typeof fetch

    const first = await fetchUpdatesIndex()
    const second = await fetchUpdatesIndex()

    expect(first).toHaveLength(1)
    expect(second).toEqual(first)
    expect(calls).toBe(1)
  })
})

describe('fetchUpdateMarkdown', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    clearUpdatesCache()
  })

  test('returns stripped markdown without leading h1', async () => {
    globalThis.fetch = (async () =>
      new Response(
        `# Hello

**bold** and [link](https://example.com)`,
        { status: 200 }
      )) as typeof fetch

    const markdown = await fetchUpdateMarkdown('hello-world')

    expect(markdown).toContain('**bold**')
    expect(markdown).toContain('[link](https://example.com)')
    expect(markdown).not.toContain('# Hello')
  })
})
