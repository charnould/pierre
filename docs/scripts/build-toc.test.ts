import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  firstParagraphPlain,
  insertDocsPages,
  insertToc,
  matchTocFolder,
  pageGroupTitle,
  renderDocsToc,
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

  it('is idempotent when run twice on the same content', () => {
    const input = `## Sommaire

<!-- toc -->

<!-- tocstop -->

## Introduction

## Section A
`

    const once = insertToc(input)
    expect(insertToc(once)).toBe(once)
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

  it('is idempotent with a custom maxdepth marker', () => {
    const input = `<!-- toc maxdepth:2 -->

<!-- tocstop -->

## Introduction
`

    const once = insertToc(input)
    expect(insertToc(once)).toBe(once)
  })

  it('leaves content unchanged when markers are missing', () => {
    const input = '## Introduction\n'
    expect(insertToc(input)).toBe(input)
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

  it('updates markdown files with a custom maxdepth toc marker', async () => {
    const filePath = await writeDoc(
      'custom-maxdepth.md',
      `## Sommaire

<!-- toc maxdepth:2 -->

<!-- tocstop -->

## Introduction

### Details
`
    )

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([filePath])
    const written = await Bun.file(filePath).text()
    expect(written).toContain('<!-- toc maxdepth:2 -->')
    expect(written).toContain('- [Introduction](#introduction)')
    expect(written).not.toMatch(/\[Details\]/)
  })

  it('updates an index that uses the docs-pages marker', async () => {
    await writeDoc('01-accueil.md', '# Accueil\n')
    const filePath = await writeDoc(
      'index.md',
      `## Sommaire

<!-- docs-pages -->

<!-- docs-pagesstop -->
`
    )

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([filePath])
    expect(await Bun.file(filePath).text()).toContain('- [Accueil](./01-accueil.md)')
  })

  it('skips markdown files without the toc marker', async () => {
    await writeDoc('plain.md', '# Plain\n\nNo toc here.')

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([])
  })

  it('skips non-markdown files', async () => {
    await writeFile(path.join(FIXTURE_DOCS_DIR, 'notes.txt'), 'plain text', 'utf8')

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([])
  })

  it('skips directories whose name ends with .md', async () => {
    await mkdir(path.join(FIXTURE_DOCS_DIR, '01-architecture.md'))

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR })

    expect(updated).toEqual([])
  })

  it('does not write files in dry run mode', async () => {
    const filePath = await writeDoc(
      'dry-run.md',
      `<!-- toc -->

<!-- tocstop -->

## Pending
`
    )

    const { updated } = await updateDocsToc({ docsDir: FIXTURE_DOCS_DIR, dryRun: true })

    expect(updated).toEqual([filePath])
    expect(await Bun.file(filePath).text()).not.toContain('- [Pending](#pending)')
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

  it('does not rewrite a skipped folder', async () => {
    const filePath = await writeDoc(
      '08-user-manual/guide.md',
      `<!-- toc -->

<!-- tocstop -->

## Hidden
`
    )
    const before = await Bun.file(filePath).text()

    const { updated } = await updateDocsToc({
      docsDir: FIXTURE_DOCS_DIR,
      skip: ['08-user-manual']
    })

    expect(updated).toEqual([])
    expect(await Bun.file(filePath).text()).toBe(before)
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
})

describe('matchTocFolder', () => {
  const folders = ['02-data-primitives', '03-install', '03-install/01-server']

  it('matches a nested page to the longest toc folder', () => {
    expect(matchTocFolder('03-install/01-server/01-installation.md', folders)).toBe(
      '03-install/01-server'
    )
  })

  it('falls back to the parent folder when no nested toc entry exists', () => {
    expect(matchTocFolder('03-install/00-knowledge/00-knowledge.md', folders)).toBe('03-install')
  })

  it('returns null when the page is outside every toc folder', () => {
    expect(matchTocFolder('04-guides/dpo.md', folders)).toBeNull()
  })
})

describe('renderDocsToc', () => {
  it('keeps a flat section as a single list', () => {
    const toc = renderDocsToc(
      [
        {
          mdPath: '02-data-primitives/index.md',
          section: '02-data-primitives',
          date: null,
          title: 'Introduction'
        },
        {
          mdPath: '02-data-primitives/01-conventions.md',
          section: '02-data-primitives',
          date: null,
          title: 'Conventions'
        }
      ],
      [{ folder: '02-data-primitives', title: 'Core Data HLM' }]
    )

    expect(toc).toContain('## Core Data HLM')
    expect(toc).toContain('- [Introduction](./docs/02-data-primitives/index.md)')
    expect(toc).toContain('- [Conventions](./docs/02-data-primitives/01-conventions.md)')
    expect(toc).not.toMatch(/^### /m)
  })

  it('groups nested pages under humanized subfolder headings', () => {
    const toc = renderDocsToc(
      [
        {
          mdPath: '03-install/index.md',
          section: '03-install',
          date: null,
          title: 'Accueil'
        },
        {
          mdPath: '03-install/00-knowledge/00-knowledge.md',
          section: '03-install',
          date: null,
          title: 'Les bases de connaissances'
        },
        {
          mdPath: '03-install/01-server/01-installation.md',
          section: '03-install',
          date: null,
          title: 'Installation'
        }
      ],
      [{ folder: '03-install', title: 'Installation & Paramétrage' }]
    )

    expect(toc).toContain('## Installation & Paramétrage')
    expect(toc).toContain('- [Accueil](./docs/03-install/index.md)')
    expect(toc).toContain('### Knowledge')
    expect(toc).toContain(
      '- [Les bases de connaissances](./docs/03-install/00-knowledge/00-knowledge.md)'
    )
    expect(toc).toContain('### Server')
    expect(toc).toContain('- [Installation](./docs/03-install/01-server/01-installation.md)')
    expect(toc.indexOf('### Knowledge')).toBeLessThan(toc.indexOf('### Server'))
  })

  it('prefixes dated articles with their file date', () => {
    const toc = renderDocsToc(
      [
        {
          mdPath: '05-articles/2026-05-27-rag-sqlite.md',
          section: '05-articles',
          date: '2026-05-27',
          title: 'From RAG to SQLite'
        }
      ],
      [{ folder: '05-articles', title: 'Articles' }]
    )

    expect(toc).toContain(
      '- [2026-05-27 — From RAG to SQLite](./docs/05-articles/2026-05-27-rag-sqlite.md)'
    )
  })
})
