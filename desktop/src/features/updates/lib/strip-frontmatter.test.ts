import { describe, expect, test } from 'bun:test'

import { stripFrontmatter, stripLeadingH1 } from './strip-frontmatter'

describe('stripFrontmatter', () => {
  test('removes yaml frontmatter block', () => {
    const input = `---
title: Hello
date: 2026-05-12
---

# Hello world`

    expect(stripFrontmatter(input)).toBe('\n# Hello world')
  })

  test('returns markdown unchanged when no frontmatter', () => {
    expect(stripFrontmatter('# Title\n\nBody')).toBe('# Title\n\nBody')
  })
})

describe('stripLeadingH1', () => {
  test('removes leading h1 line', () => {
    expect(stripLeadingH1('\n# Hello world\n\nBody')).toBe('Body')
  })

  test('returns markdown unchanged when no leading h1', () => {
    expect(stripLeadingH1('Body only')).toBe('Body only')
  })
})
