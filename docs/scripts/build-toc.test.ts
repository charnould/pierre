import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  firstParagraphPlain,
  headingIds,
  insertDocsPages,
  insertToc,
  missingRelativeMdLinks,
  pageGroupTitle,
  updateDocsToc
} from './build.ts'

const FIXTURE_ROOT = path.join(import.meta.dir, '_fixtures', 'docs-toc')
const FIXTURE_DOCS_DIR = path.join(FIXTURE_ROOT, 'docs')

beforeEach(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true })
  await mkdir(FIXTURE_DOCS_DIR, { recursive: true })
})

afterEach(async () => {
  await rm(FIXTURE_ROOT, { recursive: true, force: true })
})

async function writeDoc(relativePath: string, markdown: string): Promise<string> {
  const filePath = path.join(FIXTURE_DOCS_DIR, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, markdown, 'utf8')
  return filePath
}

describe('insertToc', () => {
  it('inserts a table of contents between toc markers', () => {
    const input = `# Title

## Sommaire

<!-- toc -->

<!-- tocstop -->

## Introduction

Body

## Section A

### Subsection

#### Deep section
`

    const output = insertToc(input)

    expect(output).toContain('<!-- toc -->')
    expect(output).toContain('<!-- tocstop -->')
    expect(output).toContain('- [Introduction](#introduction)')
    expect(output).toContain('- [Section A](#section-a)')
    expect(output).toContain('  - [Subsection](#subsection)')
    expect(output).not.toMatch(/\[Deep section\]/)
    expect(output).not.toMatch(/- \[Sommaire\]/)
    expect(output).toContain('## Introduction\n\nBody')
  })

  it('slugifies accented headings for anchor links', () => {
    const input = `<!-- toc -->

<!-- tocstop -->

## Périmètre
`

    const output = insertToc(input)

    expect(output).toContain('[Périmètre](#périmètre)')
  })

  it('keeps double hyphens when GitHub strips guillemets around a phrase', () => {
    const input = `<!-- toc -->

<!-- tocstop -->

## Construire les « communs numériques » du mouvement HLM
`

    const output = insertToc(input)

    expect(output).toContain(
      '[Construire les « communs numériques » du mouvement HLM](#construire-les--communs-numériques--du-mouvement-hlm)'
    )
  })

  it('limits each toc to the headings before the next toc marker', () => {
    const input = `<!-- toc -->

<!-- tocstop -->

## Alpha

<!-- toc -->

<!-- tocstop -->

## Beta
`
    const output = insertToc(input)
    const first = output.slice(0, output.indexOf('## Alpha'))
    const second = output.slice(output.indexOf('## Alpha'))

    expect(first).toContain('- [Alpha](#alpha)')
    expect(first).not.toContain('Beta')
    expect(second).toContain('- [Beta](#beta)')
    expect(second).not.toContain('[Alpha]')
  })

  it('stops a toc before the next document title', () => {
    const input = `<!-- toc -->

<!-- tocstop -->

## Alpha

# Next

## Sommaire

<!-- toc -->

<!-- tocstop -->

## Beta
`
    const output = insertToc(input)
    const first = output.slice(0, output.indexOf('## Alpha'))

    expect(first).toContain('- [Alpha](#alpha)')
    expect(first).not.toContain('  - [Alpha]')
    expect(first).not.toContain('Next')
    expect(first).not.toContain('Sommaire')
    expect(first).not.toContain('Beta')
  })

  it('numbers a repeated heading once across toc regions', () => {
    const input = `<!-- toc -->

<!-- tocstop -->

## Alpha

<!-- toc -->

<!-- tocstop -->

## Alpha
`
    const output = insertToc(input)

    expect(output).toContain('[Alpha](#alpha)')
    expect(output).toContain('[Alpha](#alpha-1)')
    expect(headingIds(input)).toEqual(['alpha', 'alpha-1'])
  })

  it('respects per-file maxdepth:2 and excludes h3 headings', () => {
    const input = `<!-- toc maxdepth:2 -->

<!-- tocstop -->

## Section A

### Subsection
`

    const output = insertToc(input)

    expect(output).toContain('<!-- toc maxdepth:2 -->')
    expect(output).toContain('- [Section A](#section-a)')
    expect(output).not.toMatch(/\[Subsection\]/)
  })
})

describe('pageGroupTitle', () => {
  it('groups numbered filenames into the three manual sections', () => {
    expect(pageGroupTitle('01-accueil.md')).toBe('Prendre en main')
    expect(pageGroupTitle('10-discuter.md')).toBe('Modules métier')
    expect(pageGroupTitle('20-admin-encyclopedie.md')).toBe('Administration')
  })
})

describe('firstParagraphPlain', () => {
  it('returns the first paragraph after the H1 without light markdown', () => {
    expect(
      firstParagraphPlain(
        '# Accueil\n\nL’`Accueil` est la **scène** d’arrivée. Voir [plus](./x.md).\n\nSuite.\n'
      )
    ).toBe('L’Accueil est la scène d’arrivée. Voir plus.')
  })

  it('returns null when the file has no prose paragraph', () => {
    expect(firstParagraphPlain('# Titre\n')).toBeNull()
  })
})

describe('insertDocsPages', () => {
  it('lists sibling pages grouped by filename prefix', async () => {
    await writeDoc('01-accueil.md', '# Accueil\n\nIntro.\n')
    await writeDoc('10-discuter.md', '# Discuter\n\nIntro.\n')
    await writeDoc('20-admin-encyclopedie.md', '# Administration · Encyclopédie\n\nIntro.\n')
    await writeDoc(
      'index.md',
      `## Sommaire

<!-- docs-pages -->

<!-- docs-pagesstop -->
`
    )

    const input = await Bun.file(path.join(FIXTURE_DOCS_DIR, 'index.md')).text()
    const output = await insertDocsPages(input, FIXTURE_DOCS_DIR)

    expect(output).toContain('### Prendre en main')
    expect(output).toContain('- [Accueil](./01-accueil.md) — Intro.')
    expect(output).toContain('### Modules métier')
    expect(output).toContain('- [Discuter](./10-discuter.md) — Intro.')
    expect(output).toContain('### Administration')
    expect(output).toContain(
      '- [Administration · Encyclopédie](./20-admin-encyclopedie.md) — Intro.'
    )
    expect(output).not.toContain('index.md')
  })

  it('is idempotent when run twice', async () => {
    await writeDoc('01-accueil.md', '# Accueil\n')
    const input = `<!-- docs-pages -->

<!-- docs-pagesstop -->
`
    const once = await insertDocsPages(input, FIXTURE_DOCS_DIR)
    expect(await insertDocsPages(once, FIXTURE_DOCS_DIR)).toBe(once)
  })
})

describe('updateDocsToc', () => {
  it('updates markdown files that contain the toc marker', async () => {
    const filePath = await writeDoc(
      'guide.md',
      `## Sommaire

<!-- toc -->

<!-- tocstop -->

## Introduction
`
    )

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([filePath])
    const written = await Bun.file(filePath).text()
    expect(written).toContain('- [Introduction](#introduction)')
  })

  it('skips markdown files without the toc marker', async () => {
    await writeDoc('plain.md', '# Plain\n\nNo toc here.')

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([])
  })

  it('skips directories whose name ends with .md', async () => {
    await mkdir(path.join(FIXTURE_DOCS_DIR, '01-architecture.md'))

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([])
  })

  it('returns an empty list on a second run after generation', async () => {
    await writeDoc(
      'already-generated.md',
      `<!-- toc -->

<!-- tocstop -->

## Ready
`
    )

    const first = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })
    const second = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(first.updated).toHaveLength(1)
    expect(second.updated).toEqual([])
  })

  it('updates markdown files nested in subfolders', async () => {
    const filePath = await writeDoc(
      '03-install/00-knowledge/guide.md',
      `<!-- toc -->

<!-- tocstop -->

## Nested
`
    )

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([filePath])
    expect(await Bun.file(filePath).text()).toContain('- [Nested](#nested)')
  })

  it('updates a file that contains two toc pairs', async () => {
    const filePath = await writeDoc(
      'two.md',
      `<!-- toc -->

<!-- tocstop -->

## One

<!-- toc -->

<!-- tocstop -->

## Two
`
    )

    const first = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })
    const written = await Bun.file(filePath).text()
    const second = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(first.updated).toEqual([filePath])
    expect(written).toContain('- [One](#one)')
    expect(written).toContain('- [Two](#two)')
    expect(written.indexOf('[One]')).toBeLessThan(written.indexOf('## One'))
    expect(written.indexOf('## One')).toBeLessThan(written.indexOf('[Two]'))
    expect(second.updated).toEqual([])
  })
})

describe('missingRelativeMdLinks', () => {
  it('reports a relative markdown link whose target is absent', () => {
    const raw = 'See [x](./missing.md) and [y](https://example.com/a.md) and [z](./here.md).'

    expect(
      missingRelativeMdLinks(raw, FIXTURE_DOCS_DIR, (abs) => abs.endsWith('/here.md'))
    ).toEqual(['./missing.md'])
  })

  it('ignores markdown links inside fences', () => {
    const raw = '```\n[x](./missing.md)\n```\n\n[y](./also.md)'

    expect(missingRelativeMdLinks(raw, FIXTURE_DOCS_DIR, () => false)).toEqual(['./also.md'])
  })
})
