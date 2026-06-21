import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  collectUpdateEntries,
  extractAudienceFromSlug,
  extractDateFromSlug,
  extractTitleFromHeading,
  isValidCalendarDate,
  rebuildUpdatesIndex,
  rejectFrontmatter,
  validateSlug
} from '../../../../config/build-updates.ts'

const FIXTURE_ROOT = path.join(import.meta.dir, '_fixtures', 'updates-index')
const FIXTURE_UPDATES_DIR = path.join(FIXTURE_ROOT, 'docs/updates')

beforeEach(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true })
  await mkdir(FIXTURE_UPDATES_DIR, { recursive: true })
})

afterEach(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true })
})

async function writeArticle(slug: string, markdown: string): Promise<void> {
  const dir = path.join(FIXTURE_UPDATES_DIR, slug)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.md'), markdown, 'utf8')
}

describe('isValidCalendarDate', () => {
  it('accepts valid ISO dates', () => {
    expect(isValidCalendarDate('2026-06-15')).toBe(true)
    expect(isValidCalendarDate('2024-02-29')).toBe(true)
  })

  it('rejects invalid calendar dates', () => {
    expect(isValidCalendarDate('2026-02-30')).toBe(false)
    expect(isValidCalendarDate('2026-13-01')).toBe(false)
    expect(isValidCalendarDate('invalid')).toBe(false)
  })
})

describe('validateSlug', () => {
  it('accepts dev and product slugs', () => {
    expect(validateSlug('2026-06-13-dev-my-article')).toBeNull()
    expect(validateSlug('2026-06-13-product-my-article')).toBeNull()
  })

  it('rejects invalid slug formats', () => {
    expect(validateSlug('2026-06-13 my-article')).toMatch(/spaces/)
    expect(validateSlug('2026-06-13-my-article')).toMatch(/YYYY-MM-DD/)
    expect(validateSlug('2026-06-13-tech-my-article')).toMatch(/YYYY-MM-DD/)
    expect(validateSlug('2026-06-13-dev-My-Article')).toMatch(/YYYY-MM-DD/)
    expect(validateSlug('2026-06-13-dev-my-article.md')).toMatch(/YYYY-MM-DD/)
    expect(validateSlug('2026-06-13-dev-(en)-article')).toMatch(/YYYY-MM-DD/)
    expect(validateSlug('2026-13-40-dev-my-article')).toMatch(/valid calendar date/)
    expect(validateSlug('2026-06-13')).toMatch(/YYYY-MM-DD/)
  })
})

describe('extractDateFromSlug', () => {
  it('extracts the date prefix from a valid slug', () => {
    expect(extractDateFromSlug('2026-06-15-product-building-a-desktop-app-alpha')).toBe(
      '2026-06-15'
    )
  })

  it('returns null for invalid slugs', () => {
    expect(extractDateFromSlug('bad-slug')).toBeNull()
  })
})

describe('extractAudienceFromSlug', () => {
  it('maps slug tokens to audience values', () => {
    expect(extractAudienceFromSlug('2026-06-15-product-building-a-desktop-app-alpha')).toBe(
      'product'
    )
    expect(extractAudienceFromSlug('2026-05-27-dev-from-rag-to-sqlite-and-harness')).toBe('dev')
  })

  it('returns null when the audience token is missing or unknown', () => {
    expect(extractAudienceFromSlug('2026-06-15-building-a-desktop-app-alpha')).toBeNull()
    expect(extractAudienceFromSlug('2026-06-15-tech-building-a-desktop-app-alpha')).toBeNull()
  })
})

describe('rejectFrontmatter', () => {
  it('allows markdown without frontmatter', () => {
    expect(rejectFrontmatter('# Hello\n\nBody')).toBeNull()
  })

  it('rejects any frontmatter block', () => {
    expect(rejectFrontmatter('---\naudience: product\n---\n# Hello')).toMatch(
      /frontmatter not allowed/
    )
    expect(rejectFrontmatter('---\n---\n# Hello')).toMatch(/frontmatter not allowed/)
  })
})

describe('extractTitleFromHeading', () => {
  it('extracts the first H1 title', () => {
    expect(extractTitleFromHeading('# Hello world\n\nBody')).toBe('Hello world')
  })

  it('returns null when no H1 is present', () => {
    expect(extractTitleFromHeading('No heading here')).toBeNull()
  })
})

describe('collectUpdateEntries', () => {
  it('builds entries from folder/index.md and sorts by date desc', async () => {
    await writeArticle('2026-01-01-product-older', '# Older\n\nBody')
    await writeArticle('2026-06-13-dev-newer', '# Newer\n\nBody')

    const { entries, errors } = await collectUpdateEntries(FIXTURE_UPDATES_DIR)

    expect(errors).toEqual([])
    expect(entries).toEqual([
      {
        slug: '2026-06-13-dev-newer',
        title: 'Newer',
        date: '2026-06-13',
        audience: 'dev'
      },
      {
        slug: '2026-01-01-product-older',
        title: 'Older',
        date: '2026-01-01',
        audience: 'product'
      }
    ])
  })

  it('derives date, audience and title from slug and heading', async () => {
    await writeArticle('2026-06-13-product-release-notes', '# Release notes\n\nChangelog body')

    const { entries, errors } = await collectUpdateEntries(FIXTURE_UPDATES_DIR)

    expect(errors).toEqual([])
    expect(entries[0]).toEqual({
      slug: '2026-06-13-product-release-notes',
      title: 'Release notes',
      date: '2026-06-13',
      audience: 'product'
    })
  })

  it('reports slug validation errors', async () => {
    await writeArticle('invalid slug', '# Bad\n\nBody')

    const { entries, errors } = await collectUpdateEntries(FIXTURE_UPDATES_DIR)

    expect(entries).toEqual([])
    expect(errors.some((error) => error.includes('spaces'))).toBe(true)
  })

  it('reports missing index.md for valid slugs', async () => {
    await mkdir(path.join(FIXTURE_UPDATES_DIR, '2026-06-13-dev-empty'), { recursive: true })

    const { entries, errors } = await collectUpdateEntries(FIXTURE_UPDATES_DIR)

    expect(entries).toEqual([])
    expect(errors).toEqual(['2026-06-13-dev-empty: missing index.md'])
  })

  it('reports frontmatter, missing heading and invalid audience together', async () => {
    await writeArticle('2026-06-13-product-no-heading', '---\naudience: product\n---\n\nNo heading')

    const { entries, errors } = await collectUpdateEntries(FIXTURE_UPDATES_DIR)

    expect(entries).toEqual([])
    expect(errors).toEqual([
      '2026-06-13-product-no-heading: frontmatter not allowed — derive metadata from slug and # heading',
      '2026-06-13-product-no-heading: missing # heading title'
    ])
  })

  it('ignores non-directory files at the updates root', async () => {
    await writeArticle('2026-06-13-dev-valid', '# Valid\n\nBody')
    await writeFile(
      path.join(FIXTURE_UPDATES_DIR, '2026-06-13-dev-flat.md'),
      '# Flat\n\nBody',
      'utf8'
    )

    const { entries, errors } = await collectUpdateEntries(FIXTURE_UPDATES_DIR)

    expect(errors).toEqual([])
    expect(entries).toHaveLength(1)
    expect(entries[0]?.slug).toBe('2026-06-13-dev-valid')
  })
})

describe('rebuildUpdatesIndex', () => {
  it('writes index.json when everything is valid', async () => {
    await writeArticle('2026-06-13-product-test', '# Test\n\nBody')

    const indexPath = path.join(FIXTURE_UPDATES_DIR, 'index.json')
    const { entries, errors } = await rebuildUpdatesIndex({
      updatesDir: FIXTURE_UPDATES_DIR,
      indexPath
    })

    expect(errors).toEqual([])
    expect(entries).toHaveLength(1)

    const written = JSON.parse(await Bun.file(indexPath).text())
    expect(written).toEqual(entries)
  })

  it('does not write index.json when validation fails', async () => {
    await writeArticle('bad slug', '# Test\n\nBody')

    const indexPath = path.join(FIXTURE_UPDATES_DIR, 'index.json')
    await writeFile(indexPath, '[]\n', 'utf8')

    const { entries, errors } = await rebuildUpdatesIndex({
      updatesDir: FIXTURE_UPDATES_DIR,
      indexPath
    })

    expect(entries).toEqual([])
    expect(errors.length).toBeGreaterThan(0)

    const written = await Bun.file(indexPath).text()
    expect(written).toBe('[]\n')
  })

  it('does not write index.json in dry run mode', async () => {
    await writeArticle('2026-06-13-dev-test', '# Test\n\nBody')

    const indexPath = path.join(FIXTURE_UPDATES_DIR, 'index.json')
    const { entries, errors } = await rebuildUpdatesIndex({
      updatesDir: FIXTURE_UPDATES_DIR,
      indexPath,
      dryRun: true
    })

    expect(errors).toEqual([])
    expect(entries).toHaveLength(1)
    expect(await Bun.file(indexPath).exists()).toBe(false)
  })
})
