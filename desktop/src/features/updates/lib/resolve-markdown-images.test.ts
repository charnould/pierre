import { describe, expect, test } from 'bun:test'

import { resolveMarkdownImages } from './resolve-markdown-images'
import { updateAssetUrl } from './updates-urls'

describe('resolveMarkdownImages', () => {
  test('rewrites relative image paths to github raw urls', () => {
    const markdown = '![screenshot](./desktop-screenshot.png)'
    const slug = '2026-05-from-rag-to-sqlite-and-harness-(EN)'

    expect(resolveMarkdownImages(markdown, slug)).toBe(
      `![screenshot](${updateAssetUrl(slug, 'desktop-screenshot.png')})`
    )
  })
})
