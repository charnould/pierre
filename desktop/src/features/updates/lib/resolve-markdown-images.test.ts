import { describe, expect, test } from 'bun:test'

import { resolveMarkdownImages } from './resolve-markdown-images'

describe('resolveMarkdownImages', () => {
  test('rewrites relative image paths to github raw urls', () => {
    const markdown = '![screenshot](./desktop-screenshot.png)'
    const slug = '2026-05-from-rag-to-sqlite-and-harness-(EN)'

    expect(resolveMarkdownImages(markdown, slug)).toBe(
      '![screenshot](https://raw.githubusercontent.com/charnould/pierre/master/docs/updates/2026-05-from-rag-to-sqlite-and-harness-(EN)/desktop-screenshot.png)'
    )
  })
})
