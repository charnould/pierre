import { afterEach, describe, expect, test } from 'bun:test'

import {
  clearUpdatesCache,
  fetchUpdateMarkdown,
  fetchUpdatesIndex,
  parseUpdatesToc
} from './github-updates'
import { getChangelogFolder, UPDATES_CHANGELOG_FOLDER, updatesIndexUrl } from './updates-urls'

describe('parseUpdatesToc', () => {
  test('reads changelog folder + entries from toc.json', () => {
    const parsed = parseUpdatesToc([
      {
        folder: '01-changelog',
        title: 'Changelog',
        entries: [
          { slug: 'b', title: 'B', date: '2026-01-01' },
          { slug: 'a', title: 'A', date: '2026-05-12' }
        ]
      }
    ])

    expect(parsed.folder).toBe('01-changelog')
    expect(parsed.entries.map((e) => e.slug)).toEqual(['a', 'b'])
  })

  test('returns empty entries when toc has no entries yet', () => {
    const parsed = parseUpdatesToc([
      { folder: '01-changelog', title: 'Changelog' },
      { folder: '04-guides', title: 'Guides' }
    ])
    expect(parsed.folder).toBe('01-changelog')
    expect(parsed.entries).toEqual([])
  })

  test('returns empty when toc has no changelog section', () => {
    const parsed = parseUpdatesToc([
      { folder: '04-guides', title: 'Guides' },
      { slug: 'a', title: 'A', date: '2026-05-12' }
    ])
    expect(parsed.folder).toBeNull()
    expect(parsed.entries).toEqual([])
  })
})

describe('updatesIndexUrl', () => {
  test('points at GitHub Contents API toc.json on the docs branch', () => {
    expect(updatesIndexUrl()).toContain(
      'api.github.com/repos/charnould/pierre/contents/docs/toc.json'
    )
    expect(updatesIndexUrl()).toContain('ref=docs%2Fhlm-data-domain-model')
  })
})

describe('fetchUpdatesIndex', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    clearUpdatesCache()
  })

  test('loads entries from toc and remembers changelog folder', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response(
        JSON.stringify([
          {
            folder: UPDATES_CHANGELOG_FOLDER,
            title: 'Changelog',
            entries: [{ slug: 'a', title: 'A', date: '2026-05-12' }]
          }
        ]),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    const first = await fetchUpdatesIndex()
    const second = await fetchUpdatesIndex()

    expect(first).toEqual([{ slug: 'a', title: 'A', date: '2026-05-12' }])
    expect(second).toEqual(first)
    expect(getChangelogFolder()).toBe(UPDATES_CHANGELOG_FOLDER)
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
      )) as unknown as typeof fetch

    const markdown = await fetchUpdateMarkdown('hello-world')

    expect(markdown).toContain('**bold**')
    expect(markdown).toContain('[link](https://example.com)')
    expect(markdown).not.toContain('# Hello')
  })
})
