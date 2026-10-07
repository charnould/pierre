import { watch } from 'node:fs'
import { mkdir, readdir, realpath, rm, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, sep } from 'node:path'

import { benchHtml, CARL_CSS } from './carl-page'

import prismCss from 'prismjs/themes/prism-solarizedlight.css' with { type: 'text' }

const require = createRequire(import.meta.url)

type PrismGrammar = object
type PrismApi = {
  highlight: (text: string, grammar: PrismGrammar, language: string) => string
  languages: Record<string, PrismGrammar | undefined>
}

const Prism = require('prismjs/components/prism-core.js') as PrismApi
require('prismjs/components/prism-json.js')
require('prismjs/components/prism-yaml.js')
require('prismjs/components/prism-bash.js')

const ROOT = join(import.meta.dir, '..')
const REPO = join(ROOT, '..')
const README = join(REPO, 'README.md')
const TOC_JSON = join(ROOT, 'toc.json')
const OFF = ['08-user-manual']
const INDEX_ONLY = ['04-core-intelligence-hlm']
const SITE = join(ROOT, 'site')
const PORT = 4173

const README_TOC_START = '<!-- docs-toc -->'
const README_TOC_STOP = '<!-- docs-tocstop -->'
const TOC_MARKER_RE = /<!--\s*toc(?:\s+maxdepth:(\d+))?\s*-->/
const TOC_MARKER_GLOBAL_RE = /<!--\s*toc(?:\s+maxdepth:\d+)?\s*-->/g
const TOC_STOP_RE = /<!--\s*tocstop\s*-->/
const TOC_STOP_GLOBAL_RE = /<!--\s*tocstop\s*-->/g
const DOCS_PAGES_RE = /<!--\s*docs-pages\s*-->/
const DOCS_PAGES_GLOBAL_RE = /<!--\s*docs-pages\s*-->/g
const DOCS_PAGES_STOP_RE = /<!--\s*docs-pagesstop\s*-->/
const DOCS_PAGES_STOP_GLOBAL_RE = /<!--\s*docs-pagesstop\s*-->/g
const DEFAULT_TOC_MAXDEPTH = 3

export function pageGroupTitle(filename: string): string {
  const n = Number(/^(\d+)/.exec(filename)?.[1] ?? 99)
  if (n < 10) return 'Prendre en main'
  if (n < 20) return 'Modules métier'
  return 'Administration'
}

type TocChangelogEntry = { slug: string; title: string; date: string }
export type TocEntry = {
  folder: string
  title: string
  html?: false
  entries?: TocChangelogEntry[]
}

export type DocPage = {
  mdPath: string
  section: string
  date: string | null
  title: string
}

export type UpdateDocsTocOptions = { docsDir: string; dryRun?: boolean; skip?: string[] }
export type UpdateDocsTocResult = { updated: string[]; skipped: string[] }

function prepare(raw: string) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

function stripOrder(name: string) {
  return name.replace(/^\d{1,2}-/, '')
}

function humanize(slug: string) {
  const raw = stripOrder(slug)
  if (!raw.includes('-') && raw.length <= 4) return raw.toUpperCase()
  const spaced = raw.replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Match GitHub heading IDs: strip punctuation, keep each space as its own hyphen. */
function githubSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-')
}

function uniqueSlug(text: string, used: Map<string, number>) {
  let slug = githubSlug(text) || 'heading'
  const n = used.get(slug) ?? 0
  used.set(slug, n + 1)
  if (n > 0) slug = `${slug}-${n}`
  return slug
}

function isOff(rel: string, folders: readonly string[] = OFF) {
  return folders.some((folder) => rel === folder || rel.startsWith(`${folder}/`))
}

function tocEntry(e: TocEntry): TocEntry {
  return e.html === false
    ? { folder: e.folder, title: e.title, html: false }
    : { folder: e.folder, title: e.title }
}

function isUnpublished(rel: string, folders: readonly string[]) {
  return folders.some((folder) => rel === folder || rel.startsWith(`${folder}/`))
}

function indexOnlyFolder(rel: string) {
  return INDEX_ONLY.find((folder) => rel === folder || rel.startsWith(`${folder}/`))
}

function notItsIndex(rel: string) {
  const folder = indexOnlyFolder(rel)
  return folder !== undefined && rel !== `${folder}/index.md`
}

const GITHUB_BLOB = 'https://github.com/charnould/pierre/blob/master'

function decodePath(path: string) {
  return path
    .split('/')
    .map((part) => {
      try {
        return decodeURIComponent(part)
      } catch {
        return part
      }
    })
    .join('/')
}

/** Relative .md links that are not emitted as HTML become a GitHub blob URL. */
export function rewriteUnpublishedLinks(
  html: string,
  fromDir: string,
  unpublished: readonly string[]
) {
  return html.replace(/\bhref="([^"]+)"/g, (match, url: string) => {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(url) || url.startsWith('/')) return match
    const hashAt = url.indexOf('#')
    const path = hashAt === -1 ? url : url.slice(0, hashAt)
    const hash = hashAt === -1 ? '' : url.slice(hashAt)
    if (!path.endsWith('.md')) return match
    const repoRel = relative(REPO, join(fromDir, decodePath(path))).replaceAll('\\', '/')
    if (repoRel.startsWith('..') || !repoRel.startsWith('docs/')) return match
    const docsRel = repoRel.slice('docs/'.length)
    if (!isUnpublished(docsRel, unpublished) && !notItsIndex(docsRel)) return match
    const encoded = repoRel
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')
    return `href="${GITHUB_BLOB}/${encoded}${hash}"`
  })
}

function isDecorativeHeading(text: string) {
  return /^[―—–-]+$/.test(text.trim())
}

function firstH1(raw: string, fallback: string) {
  const text = raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (text && !isDecorativeHeading(text)) return text
  return fallback
}

/** First prose paragraph after the H1, stripped of light markdown. */
export function firstParagraphPlain(raw: string): string | null {
  const afterH1 = raw.replace(/^#\s+.+$/m, '').trim()
  const para = afterH1.split(/\n\n/)[0]?.trim()
  if (!para || para.startsWith('#') || para.startsWith('<!--')) return null
  const plain = para
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return plain || null
}

function fileDate(name: string): string | null {
  return /^(\d{4}-\d{2}-\d{2})(?:-|$)/.exec(name)?.[1] ?? null
}

/** Longest toc.json folder that contains this page (`03-install/01-server` beats `03-install`). */
export function matchTocFolder(mdPath: string, folders: string[]): string | null {
  let best: string | null = null
  for (const folder of folders) {
    if (mdPath !== `${folder}.md` && !mdPath.startsWith(`${folder}/`)) continue
    if (best === null || folder.length > best.length) best = folder
  }
  return best
}

function compareDocPages(a: DocPage, b: DocPage) {
  const aIndex = a.mdPath.split('/').pop() === 'index.md' ? 0 : 1
  const bIndex = b.mdPath.split('/').pop() === 'index.md' ? 0 : 1
  if (aIndex !== bIndex) return aIndex - bIndex
  return a.mdPath.localeCompare(b.mdPath, 'en', { numeric: true })
}

function subdirOf(mdPath: string, folder: string): string | null {
  const rest = mdPath.startsWith(`${folder}/`) ? mdPath.slice(folder.length + 1) : mdPath
  const slash = rest.indexOf('/')
  return slash === -1 ? null : rest.slice(0, slash)
}

function isSkippedPath(abs: string) {
  return abs.includes('/node_modules/') || abs.includes('/assets/')
}

async function isOutsideDocs(abs: string) {
  const root = await realpath(ROOT)
  try {
    const real = await realpath(abs)
    return real !== root && !real.startsWith(root + sep)
  } catch {
    return true
  }
}

async function isMarkdownFile(abs: string) {
  if (!abs.endsWith('.md')) return false
  try {
    return (await stat(abs)).isFile()
  } catch {
    return false
  }
}

export function insertToc(content: string): string {
  const openMatch = content.match(TOC_MARKER_RE)
  const closeMatch = TOC_STOP_RE.exec(content)
  if (!openMatch || !closeMatch) return content

  const maxdepth = openMatch[1] ? Number(openMatch[1]) : DEFAULT_TOC_MAXDEPTH
  const after = content.slice(closeMatch.index + closeMatch[0].length)
  const used = new Map<string, number>()
  const items: { level: number; text: string; slug: string }[] = []
  let inFence = false

  for (const line of after.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (!heading) continue
    const level = heading[1]!.length
    if (level > maxdepth) continue
    const text = heading[2]!.trim()
    if (isDecorativeHeading(text)) continue
    items.push({ level, text, slug: uniqueSlug(text, used) })
  }

  const min = items.length ? Math.min(...items.map((i) => i.level)) : 0
  const list = items.map((i) => `${'  '.repeat(i.level - min)}- [${i.text}](#${i.slug})`).join('\n')
  const block = list
    ? `${openMatch[0]}\n\n${list}\n\n<!-- tocstop -->`
    : `${openMatch[0]}\n\n<!-- tocstop -->`

  return `${content.slice(0, openMatch.index)}${block}${after}`
}

export async function insertDocsPages(content: string, folderAbs: string): Promise<string> {
  const openMatch = content.match(DOCS_PAGES_RE)
  const closeMatch = DOCS_PAGES_STOP_RE.exec(content)
  if (!openMatch || !closeMatch) return content

  const names = (await readdir(folderAbs))
    .filter((name) => name.endsWith('.md') && name !== 'index.md')
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

  const groups = new Map<string, string[]>()
  const groupOrder: string[] = []
  for (const name of names) {
    const raw = prepare(await Bun.file(join(folderAbs, name)).text())
    if (!raw.trim()) continue
    const title = firstH1(raw, humanize(name.replace(/^\d+-/, '').replace(/\.md$/, '')))
    const blurb = firstParagraphPlain(raw)
    const group = pageGroupTitle(name)
    if (!groups.has(group)) {
      groups.set(group, [])
      groupOrder.push(group)
    }
    groups
      .get(group)!
      .push(blurb ? `- [${title}](./${name}) — ${blurb}` : `- [${title}](./${name})`)
  }

  const list = groupOrder
    .map((group) => `### ${group}\n\n${groups.get(group)!.join('\n')}`)
    .join('\n\n')
  const after = content.slice(closeMatch.index + closeMatch[0].length)
  const block = list
    ? `${openMatch[0]}\n\n${list}\n\n<!-- docs-pagesstop -->`
    : `${openMatch[0]}\n\n<!-- docs-pagesstop -->`

  return `${content.slice(0, openMatch.index)}${block}${after}`
}

function markerPairCount(content: string, open: RegExp, close: RegExp) {
  return {
    open: content.match(open)?.length ?? 0,
    close: content.match(close)?.length ?? 0
  }
}

export async function updateDocsToc({
  docsDir,
  dryRun = false,
  skip = []
}: UpdateDocsTocOptions): Promise<UpdateDocsTocResult> {
  const updated: string[] = []
  const skipped: string[] = []

  for (const file of await readdir(docsDir, { recursive: true })) {
    const path = join(docsDir, String(file))
    const rel = relative(docsDir, path).replaceAll('\\', '/')
    if (!(await isMarkdownFile(path)) || isSkippedPath(path) || rel.startsWith('scripts/')) continue
    if (isOff(rel, skip)) continue

    const content = await Bun.file(path).text()
    const hasToc = TOC_MARKER_RE.test(content)
    const hasPages = DOCS_PAGES_RE.test(content)
    if (!hasToc && !hasPages) continue

    const toc = markerPairCount(content, TOC_MARKER_GLOBAL_RE, TOC_STOP_GLOBAL_RE)
    const pages = markerPairCount(content, DOCS_PAGES_GLOBAL_RE, DOCS_PAGES_STOP_GLOBAL_RE)
    if (
      (hasToc && (toc.open > 1 || toc.close > 1)) ||
      (hasPages && (pages.open > 1 || pages.close > 1))
    ) {
      skipped.push(path)
      continue
    }

    let next = content
    if (hasToc) next = insertToc(next)
    if (hasPages) next = await insertDocsPages(next, dirname(path))
    if (next === content) continue
    if (!dryRun) await Bun.write(path, next)
    updated.push(path)
  }

  return { updated, skipped }
}

async function loadTocConfig(): Promise<TocEntry[]> {
  const raw = await Bun.file(TOC_JSON).json()
  if (!Array.isArray(raw)) throw new Error('docs/toc.json must be an array')
  return raw.map((e, i) => {
    if (!e || typeof e.folder !== 'string' || typeof e.title !== 'string') {
      throw new Error(`docs/toc.json[${i}] must have { folder, title } strings`)
    }
    return tocEntry(e)
  })
}

async function syncChangelogEntries(toc: TocEntry[]): Promise<TocEntry[]> {
  const next = toc.map(tocEntry)
  const changelog = next.find((e) => stripOrder(e.folder) === 'changelog')
  if (!changelog) return next

  const changelogDir = join(ROOT, changelog.folder)
  const entries: TocChangelogEntry[] = []

  try {
    for (const name of await readdir(changelogDir)) {
      if (!name.endsWith('.md')) continue
      const slug = name.slice(0, -3)
      const date = fileDate(slug)
      if (!date) continue
      const raw = prepare(await Bun.file(join(changelogDir, name)).text())
      const title = firstH1(raw, humanize(slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')))
      entries.push({ slug, title, date })
    }
  } catch {
    console.warn(`toc.json: cannot read changelog folder "${changelog.folder}"`)
  }

  entries.sort((a, b) => b.date.localeCompare(a.date))
  changelog.entries = entries
  await Bun.write(TOC_JSON, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`✓ toc.json (${entries.length} changelog entries)`)
  return next
}

async function collectDocs(folders: string[]): Promise<DocPage[]> {
  const pages: DocPage[] = []

  for (const file of await readdir(ROOT, { recursive: true })) {
    const abs = join(ROOT, String(file))
    if (!(await isMarkdownFile(abs)) || isSkippedPath(abs)) continue
    const mdPath = relative(ROOT, abs).replaceAll('\\', '/')
    if (mdPath === 'index.md' || mdPath.startsWith('scripts/')) continue

    const section = matchTocFolder(mdPath, folders)
    if (!section || notItsIndex(mdPath)) continue
    const base = mdPath.split('/').pop()!.replace(/\.md$/, '')
    const raw = prepare(await Bun.file(abs).text())
    if (!raw.trim()) continue
    pages.push({
      mdPath,
      section,
      date: fileDate(base),
      title: firstH1(raw, humanize(base.replace(/^\d{4}-\d{2}-\d{2}-/, '')))
    })
  }

  pages.sort(compareDocPages)
  return pages
}

function pageLink(page: DocPage, showDate: boolean) {
  const label = showDate && page.date ? `${page.date} — ${page.title}` : page.title
  return `- [${label}](./docs/${page.mdPath})`
}

function renderSectionPages(pages: DocPage[], folder: string, showDate: boolean): string[] {
  const root: DocPage[] = []
  const nested = new Map<string, DocPage[]>()

  for (const page of pages) {
    const sub = subdirOf(page.mdPath, folder)
    if (!sub) {
      root.push(page)
      continue
    }
    const list = nested.get(sub) ?? []
    list.push(page)
    nested.set(sub, list)
  }

  const lines: string[] = []
  for (const page of root.sort(compareDocPages)) lines.push(pageLink(page, showDate))

  const subs = [...nested.keys()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  for (const sub of subs) {
    if (lines.length) lines.push('')
    lines.push(`### ${humanize(sub)}`, '')
    for (const page of nested.get(sub)!.sort(compareDocPages)) {
      lines.push(pageLink(page, showDate))
    }
  }

  return lines
}

export function renderDocsToc(pages: DocPage[], toc: TocEntry[]): string {
  const bySection = new Map<string, DocPage[]>()
  for (const p of pages) {
    const list = bySection.get(p.section) ?? []
    list.push(p)
    bySection.set(p.section, list)
  }

  const lines: string[] = []
  for (const entry of toc) {
    const sectionPages = bySection.get(entry.folder)
    if (!sectionPages?.length) {
      console.warn(`toc.json: folder "${entry.folder}" not found or empty — skipped`)
      continue
    }
    const leaf = stripOrder(entry.folder.split('/').pop()!)
    const showDate = leaf === 'changelog' || leaf === 'articles'
    lines.push(`## ${entry.title}`, '')
    lines.push(...renderSectionPages(sectionPages, entry.folder, showDate))
    lines.push('')
  }

  return `${README_TOC_START}\n\n${lines.join('\n').trimEnd()}\n\n${README_TOC_STOP}`
}

async function updateRootReadme(pages: DocPage[], toc: TocEntry[]) {
  const block = renderDocsToc(pages, toc)
  let readme = await Bun.file(README).text()
  readme = readme.replace(
    new RegExp(`${README_TOC_START}[\\s\\S]*?${README_TOC_STOP}\\n*`, 'g'),
    ''
  )
  readme = readme.replaceAll(`${README_TOC_START}\n`, '').replaceAll(`${README_TOC_STOP}\n`, '')
  readme = readme.replaceAll(README_TOC_START, '').replaceAll(README_TOC_STOP, '')

  const titleMatch = readme.match(/^#\s+[^\n]+\n+/)
  if (titleMatch) {
    const afterTitle = readme.slice(titleMatch[0].length)
    const licenceIdx = afterTitle.search(/^## Licence\b/m)
    readme =
      licenceIdx >= 0
        ? `${titleMatch[0]}${block}\n\n${afterTitle.slice(licenceIdx)}`
        : `${titleMatch[0]}${block}\n\n${afterTitle}`
  } else {
    readme = `${block}\n\n${readme}`
  }

  await Bun.write(README, readme)
  console.log('✓ README.md (docs toc)')
}

function pageHtml(
  title: string,
  body: string,
  extra?: { css: string; html: string; bodyClass: string },
  assets = './'
) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${Bun.escapeHTML(title)} · PIERRE</title>
  <link rel="icon" href="${assets}assets/favicon.ico" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Knewave&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" />
  <style>
    html, body { margin: 0; }
    body { background: #fff; }
    .article {
      box-sizing: border-box;
      max-width: 850px;
      margin: 0;
      padding: 2rem 2rem 3rem 4rem;
      font-family: Merriweather, Georgia, serif;
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
      letter-spacing: 0;
      color: rgb(17, 17, 17);
      text-align: left;
      -webkit-font-smoothing: antialiased;
    }
    @media (max-width: 39.99rem) {
      .article {
        padding: 1.25rem 1.25rem 2rem;
      }
    }
    .article h1,
    .article h2,
    .article h3,
    .article h4,
    .article h5,
    .article h6 {
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-weight: 700;
      letter-spacing: 0;
      color: rgb(17, 17, 17);
      text-wrap: balance;
      -webkit-font-smoothing: antialiased;
    }
    .article h1 {
      font-size: 36px;
      line-height: 40.32px;
      margin: 0 0 16px;
    }
    .article h2 {
      font-size: 36px;
      line-height: 40.32px;
      margin: 80px 0 40px;
    }
    .article h3 {
      font-size: 24px;
      line-height: 28px;
      margin: 40px 0 20px;
    }
    .article p {
      margin: 0 0 16px;
      text-wrap: pretty;
    }
    .article ul,
    .article ol {
      margin: 0 0 16px;
      padding-inline-start: 1.5em;
    }
    .article ul {
      list-style-type: disc;
    }
    .article ol {
      list-style-type: decimal;
    }
    .article li {
      display: list-item;
      margin: 0 0 8px;
      padding-inline-start: 0.25em;
    }
    .article li:last-child {
      margin-bottom: 0;
    }
    .article ul ul {
      list-style-type: circle;
      margin: 8px 0 0;
    }
    .article a {
      color: #0000ee;
      text-underline-offset: 0.15em;
    }
    .article a:hover {
      text-decoration-thickness: 2px;
    }
    .article strong {
      font-weight: 600;
    }
    .article pre:not(.cadre) {
      padding: 1em;
    }
    .article :not(pre) > code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.875em;
    }
    .article p:has(> .shot) {
      --shot-gap: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: var(--shot-gap);
      justify-content: flex-start;
      width: min(calc(32rem * 3 + var(--shot-gap) * 2), calc(100vw - 4rem));
      max-width: none;
      margin-block-start: 30px;
      margin-inline: 0;
    }
    @media (max-width: 39.99rem) {
      .article p:has(> .shot) {
        width: calc(100vw - 2.5rem);
      }
    }
    .article .shot {
      position: relative;
      isolation: isolate;
      overflow: visible;
      flex: 0 1 100%;
      width: 100%;
      max-width: 100%;
    }
    @media (min-width: 40rem) {
      .article .shot {
        flex: 0 1 calc((100% - var(--shot-gap) * 2) / 3);
        width: calc((100% - var(--shot-gap) * 2) / 3);
        max-width: calc((100% - var(--shot-gap) * 2) / 3);
      }
      .article p:has(> .shot:only-child) .shot:has(img[data-zoomable]),
      .article p:has(> .shot:nth-child(even):last-child) .shot:has(img[data-zoomable]) {
        flex-basis: calc((100% - var(--shot-gap)) / 2);
        width: calc((100% - var(--shot-gap)) / 2);
        max-width: calc((100% - var(--shot-gap)) / 2);
      }
      .article p:has(> .shot) .shot:not(:has(img[data-zoomable])) {
        flex-basis: 90%;
        width: 90%;
        max-width: 90%;
      }
    }
    .article .shot img {
      display: block;
      width: 100%;
      margin: 0;
      transform: translateX(-4.01%);
    }
    .article .shot img[data-zoomable] {
      cursor: zoom-in;
    }
    .article .shot-title {
      position: absolute;
      top: 0.45rem;
      left: -0.65rem;
      z-index: 1;
      max-width: calc(100% - 1rem);
      padding: 0.15rem 0.55rem 0.08rem;
      background: #ffe500;
      color: #111;
      font-family: Knewave, cursive;
      font-size: 1.05rem;
      font-weight: 400;
      font-synthesis: none;
      letter-spacing: 0.01em;
      line-height: 1.15;
      text-transform: uppercase;
      text-wrap: balance;
      transform: rotate(-2deg);
      transform-origin: left center;
      pointer-events: none;
    }
    .article p:has(> .shot) .shot:not(:has(img[data-zoomable])) .shot-title {
      top: 1.5rem;
      left: -0.65rem;
    }
    body.is-zooming .shot-title {
      opacity: 0;
    }
    ${extra?.css ?? ''}
    ${prismCss}
  </style>
</head>
<body${extra ? ` class="${extra.bodyClass}"` : ''}>
  <article class="article">
    ${body}
  </article>
  ${extra?.html ?? ''}
  <script src="https://cdn.jsdelivr.net/npm/medium-zoom@1.1.0/dist/medium-zoom.min.js"></script>
  <script>
    const zoom = mediumZoom('[data-zoomable]', { background: '#fff', margin: 24 })
    zoom.on('open', () => document.body.classList.add('is-zooming'))
    zoom.on('closed', () => document.body.classList.remove('is-zooming'))
  </script>
</body>
</html>
`
}

const ALERT_LABEL: Record<string, string> = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution'
}

function headingIds(raw: string) {
  const open = raw.match(TOC_MARKER_RE)
  const close = TOC_STOP_RE.exec(raw)
  const maxdepth = open?.[1] ? Number(open[1]) : DEFAULT_TOC_MAXDEPTH
  const tocStart = open && close ? close.index + close[0].length : -1
  const tocUsed = new Map<string, number>()
  const otherUsed = new Map<string, number>()
  const ids: string[] = []
  let inFence = false
  let rest = raw
  let pos = 0
  while (rest.length) {
    const nl = rest.indexOf('\n')
    const line = (nl === -1 ? rest : rest.slice(0, nl)).replace(/\r$/, '')
    const lineStart = pos
    pos += nl === -1 ? rest.length : nl + 1
    rest = nl === -1 ? '' : rest.slice(nl + 1)
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (!heading) continue
    const text = heading[2]!.trim()
    if (isDecorativeHeading(text)) {
      ids.push(uniqueSlug(text, otherUsed))
      continue
    }
    const level = heading[1]!.length
    const inToc = tocStart >= 0 && lineStart >= tocStart && level <= maxdepth
    ids.push(uniqueSlug(text, inToc ? tocUsed : otherUsed))
  }
  return ids
}

function attr(attrs: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? ''
}

function decodeAttr(value: string) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function applyHeadingIds(html: string, ids: string[]) {
  let i = 0
  return html.replace(/<h([1-6])>/g, (_, level: string) => {
    const id = ids[i++]
    return id ? `<h${level} id="${id}">` : `<h${level}>`
  })
}

function applyImages(html: string) {
  return html.replace(/<img\b([^>]*?)\/?>/g, (_, attrs: string) => {
    const src = attr(attrs, 'src')
    const alt = attr(attrs, 'alt')
    const zoom = src.endsWith('#zoom')
    const nextSrc = zoom ? src.slice(0, -'#zoom'.length) : src
    let img = `<img src="${nextSrc}" alt="${alt}"`
    if (zoom) img += ' data-zoomable=""'
    img += ' />'
    const title = decodeAttr(alt).trim()
    if (!title) return img
    return `<span class="shot"><span class="shot-title" aria-hidden="true">${Bun.escapeHTML(title)}</span>${img}</span>`
  })
}

function applyTables(html: string) {
  return html.replace(
    /<table>[\s\S]*?<\/table>/g,
    (table) => `<div class="typeset-scroll">${table}</div>`
  )
}

function applyAlerts(html: string) {
  return html.replace(
    /<blockquote>\n<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n/g,
    (_, kind: string) => `<blockquote>\n<p><strong>${ALERT_LABEL[kind]}</strong></p>\n<p>`
  )
}

function retargetMdLinks(html: string) {
  return html.replace(/\bhref="([^"]+)"/g, (match, url: string) => {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(url) || url.startsWith('/')) return match
    const hashAt = url.indexOf('#')
    const path = hashAt === -1 ? url : url.slice(0, hashAt)
    const hash = hashAt === -1 ? '' : url.slice(hashAt)
    if (!path.endsWith('.md')) return match
    return `href="${path.slice(0, -3)}.html${hash}"`
  })
}

function assetPrefix(outDir: string) {
  const rel = relative(ROOT, outDir)
  if (!rel || rel === '.') return './'
  return '../'.repeat(rel.split('/').filter(Boolean).length)
}

const FENCE_RE = /<pre><code class="language-(json|yaml|bash)">([\s\S]*?)<\/code><\/pre>/g

export function highlightFences(html: string) {
  return html.replace(FENCE_RE, (full, lang: string, body: string) => {
    const grammar = Prism.languages[lang]
    if (!grammar) return full
    const highlighted = Prism.highlight(decodeAttr(body), grammar, lang)
    return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`
  })
}

function renderHtml(
  raw: string,
  fromDir: string,
  outDir: string,
  label: string,
  unpublished: readonly string[]
) {
  let html = highlightFences(Bun.markdown.html(raw, { autolinks: true }))
  const ids = headingIds(raw)
  const found = html.match(/<h[1-6]>/g)?.length ?? 0
  if (found !== ids.length) console.warn(`${label}: ${found} titres, ${ids.length} ancres`)
  html = applyHeadingIds(html, ids)
  html = applyImages(html)
  html = applyTables(html)
  html = applyAlerts(html)
  if (raw.includes('<!-- carl -->')) html = html.replaceAll('<!-- carl -->', benchHtml())
  return retargetMdLinks(
    rebaseLinks(rewriteUnpublishedLinks(html, fromDir, unpublished), fromDir, outDir)
  )
}

function prefixSiteLinks(html: string) {
  return html.replace(/\bhref="(\.\/[^"]+)"/g, (match, url: string) => {
    const hashAt = url.indexOf('#')
    const path = hashAt === -1 ? url : url.slice(0, hashAt)
    if (!path.endsWith('.html') || path.startsWith('./site/') || path.startsWith('./assets/'))
      return match
    return `href="./site/${url.slice(2)}"`
  })
}

async function renderPage(
  mdAbs: string,
  outAbs: string,
  unpublished: readonly string[],
  home = false
) {
  const raw = prepare(await Bun.file(mdAbs).text())
  if (!raw.trim()) return false
  const rel = relative(ROOT, mdAbs).replaceAll('\\', '/')
  const base = rel.split('/').pop()!.replace(/\.md$/, '')
  const title = firstH1(raw, humanize(base.replace(/^\d{4}-\d{2}-\d{2}-/, '')))
  const hasBench = raw.includes('<!-- carl -->')
  const body = renderHtml(raw, dirname(mdAbs), dirname(outAbs), rel, unpublished)
  await mkdir(dirname(outAbs), { recursive: true })
  await Bun.write(
    outAbs,
    pageHtml(
      title,
      home ? prefixSiteLinks(body) : body,
      hasBench ? { css: CARL_CSS, html: '', bodyClass: 'has-bench' } : undefined,
      assetPrefix(dirname(outAbs))
    )
  )
  return true
}

function rebaseLinks(html: string, fromDir: string, toDir: string) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (match, attr: string, url: string) => {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(url) || url.startsWith('/')) return match
    const hashAt = url.indexOf('#')
    const path = hashAt === -1 ? url : url.slice(0, hashAt)
    const hash = hashAt === -1 ? '' : url.slice(hashAt)
    if (!path) return match
    let rel = relative(toDir, join(fromDir, path)).replaceAll('\\', '/')
    if (!rel.startsWith('.')) rel = `./${rel}`
    return `${attr}="${rel}${hash}"`
  })
}

async function build() {
  const { updated, skipped } = await updateDocsToc({ docsDir: ROOT, skip: OFF })
  if (updated.length) {
    console.log(`✓ intra-file toc (${updated.length})`)
    for (const file of updated) console.log(`  - ${relative(ROOT, file)}`)
  }
  if (skipped.length) {
    console.warn(`intra-file toc: skipped ${skipped.length} file(s) with multiple markers`)
  }

  const toc = await syncChangelogEntries(await loadTocConfig())
  const unpublished = toc.filter((e) => e.html === false).map((e) => e.folder)
  const pages = await collectDocs(toc.map((e) => e.folder))
  await updateRootReadme(pages, toc)

  await rm(SITE, { recursive: true, force: true })
  let written = 0
  for (const file of await readdir(ROOT, { recursive: true })) {
    const abs = join(ROOT, String(file))
    if (!(await isMarkdownFile(abs)) || isSkippedPath(abs)) continue
    const rel = relative(ROOT, abs).replaceAll('\\', '/')
    if (
      rel.startsWith('scripts/') ||
      rel.startsWith('site/') ||
      isOff(rel) ||
      isUnpublished(rel, unpublished) ||
      notItsIndex(rel)
    )
      continue
    if (await isOutsideDocs(abs)) continue
    const home = rel === 'index.md'
    const out = home ? join(ROOT, 'index.html') : join(SITE, `${rel.slice(0, -3)}.html`)
    if (await renderPage(abs, out, unpublished, home)) written++
  }
  console.log(`✓ html (${written})`)
  console.log(`✓ README toc (${pages.length} pages)`)
}

function toRel(filename: string) {
  const abs = filename.startsWith('/') ? filename : join(ROOT, filename)
  return relative(ROOT, abs).replaceAll('\\', '/')
}

function shouldIgnore(rel: string) {
  return (
    !rel ||
    rel.startsWith('..') ||
    rel.endsWith('.html') ||
    rel === 'node_modules' ||
    rel.startsWith('node_modules/') ||
    rel.startsWith('scripts/') ||
    rel === 'site' ||
    rel.startsWith('site/') ||
    rel.startsWith('.') ||
    rel.includes('/.') ||
    isOff(rel)
  )
}

function notFound() {
  return new Response('Introuvable', { status: 404 })
}

async function isFile(abs: string) {
  try {
    return (await stat(abs)).isFile()
  } catch {
    return false
  }
}

function withReload(html: string) {
  const script = '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>'
  return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : html + script
}

function serve(notify: { clients: Set<ReadableStreamDefaultController<Uint8Array>> }) {
  const encoder = new TextEncoder()
  return Bun.serve({
    port: PORT,
    hostname: '127.0.0.1',
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === '/__reload') {
        let current: ReadableStreamDefaultController<Uint8Array> | undefined
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            current = controller
            notify.clients.add(controller)
            controller.enqueue(encoder.encode(': ok\n\n'))
          },
          cancel() {
            if (current) notify.clients.delete(current)
          }
        })
        return new Response(stream, {
          headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
        })
      }

      let rel: string
      try {
        rel = decodeURIComponent(url.pathname)
      } catch {
        return notFound()
      }
      rel = (rel === '/' ? 'index.html' : rel.replace(/^\/+/, '')).replaceAll('\\', '/')
      if (rel.includes('..') || isOff(rel)) return notFound()

      if (rel.startsWith('site/')) {
        const rest = rel.slice('site/'.length)
        if (!rest || isOff(rest)) return notFound()
        const location = `/${rest.split('/').map(encodeURIComponent).join('/')}`
        return Response.redirect(new URL(location, req.url), 302)
      }

      if (rel.endsWith('.md')) {
        const htmlRel = `${rel.slice(0, -3)}.html`
        if (!(await Bun.file(join(SITE, htmlRel)).exists())) return notFound()
        const location = `/${htmlRel.split('/').map(encodeURIComponent).join('/')}`
        return Response.redirect(new URL(location, req.url), 302)
      }

      let fileAbs =
        rel.endsWith('.html') && rel !== 'index.html' ? join(SITE, rel) : join(ROOT, rel)
      if (!(await isFile(fileAbs))) {
        if (!rel.endsWith('.html') || rel === 'index.html') return notFound()
        fileAbs = join(ROOT, rel)
        if (!(await isFile(fileAbs))) return notFound()
      }
      const file = Bun.file(fileAbs)
      if (!rel.endsWith('.html')) return new Response(file)
      return new Response(withReload(await file.text()), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    }
  })
}

function watchDocs(notify: (ok: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let building = false
  let pending: string | undefined
  let coolUntil = 0

  async function rebuild(reason: string) {
    if (building) {
      pending = reason
      return
    }
    building = true
    coolUntil = Date.now() + 60_000
    console.log(`\n↻ ${reason}`)
    let ok = false
    try {
      await build()
      ok = true
    } catch (err) {
      console.error('build failed:', err)
    }
    coolUntil = Date.now() + 400
    building = false
    if (pending) {
      const next = pending
      pending = undefined
      await rebuild(next)
      return
    }
    notify(ok)
  }

  return watch(ROOT, { recursive: true }, (_event, filename) => {
    if (!filename || Date.now() < coolUntil) return
    const rel = toRel(String(filename))
    if (shouldIgnore(rel)) return
    clearTimeout(timer)
    timer = setTimeout(() => rebuild(rel), 150)
  })
}

if (import.meta.path === Bun.main) {
  await build()
  const encoder = new TextEncoder()
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
  const server = serve({ clients })
  const watcher = watchDocs((ok) => {
    if (!ok) return
    const data = encoder.encode('data: 1\n\n')
    for (const client of clients) {
      try {
        client.enqueue(data)
      } catch {
        clients.delete(client)
      }
    }
  })
  const shutdown = () => {
    watcher.close()
    server.stop(true)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  console.log(`\n→ http://127.0.0.1:${server.port}/`)
  await new Promise(() => {})
}
