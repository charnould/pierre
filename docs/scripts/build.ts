import { statSync, watch } from 'node:fs'
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
const SRC = join(ROOT, 'src')
const REPO = join(ROOT, '..')
const TOC_JSON = join(ROOT, 'toc.json')
const SITE = join(ROOT, 'site')
const PORT = 4173

const TOC_MARKER_RE = /<!--\s*toc(?:\s+maxdepth:(\d+))?\s*-->/
const TOC_STOP_RE = /<!--\s*tocstop\s*-->/
const DOCS_PAGES_RE = /<!--\s*docs-pages\s*-->/
const DOCS_PAGES_STOP_RE = /<!--\s*docs-pagesstop\s*-->/
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
  html?: false | 'index'
  entries?: TocChangelogEntry[]
}

export type UpdateDocsTocOptions = { docsDir: string }
export type UpdateDocsTocResult = { updated: string[] }

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

function tocEntry(e: TocEntry): TocEntry {
  const base = { folder: e.folder, title: e.title }
  return e.html === false || e.html === 'index' ? { ...base, html: e.html } : base
}

function inFolder(rel: string, folders: readonly string[]) {
  return folders.some((folder) => rel === folder || rel.startsWith(`${folder}/`))
}

function notItsIndex(rel: string, indexOnly: readonly string[]) {
  const folder = indexOnly.find((name) => rel === name || rel.startsWith(`${name}/`))
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
  unpublished: readonly string[],
  indexOnly: readonly string[] = []
) {
  return html.replace(/\bhref="([^"]+)"/g, (match, url: string) => {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(url) || url.startsWith('/')) return match
    const hashAt = url.indexOf('#')
    const path = hashAt === -1 ? url : url.slice(0, hashAt)
    const hash = hashAt === -1 ? '' : url.slice(hashAt)
    if (!path.endsWith('.md')) return match
    const repoRel = relative(REPO, join(fromDir, decodePath(path))).replaceAll('\\', '/')
    if (repoRel.startsWith('..') || !repoRel.startsWith('docs/')) return match
    const docsRel = repoRel.slice('docs/'.length).replace(/^src\//, '')
    if (!inFolder(docsRel, unpublished) && !notItsIndex(docsRel, indexOnly)) return match
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

type TocPair = {
  openStart: number
  openText: string
  maxdepth: number
  closeEnd: number
  regionEnd: number
}

function tocPairs(content: string): TocPair[] {
  const pairs: TocPair[] = []
  let cursor = 0
  while (cursor < content.length) {
    const open = content.slice(cursor).match(TOC_MARKER_RE)
    if (open?.index === undefined) break
    const openStart = cursor + open.index
    const afterOpen = openStart + open[0].length
    const close = content.slice(afterOpen).match(TOC_STOP_RE)
    if (close?.index === undefined) break
    const closeEnd = afterOpen + close.index + close[0].length
    const regionEnd = tocRegionEnd(content, closeEnd)
    pairs.push({
      openStart,
      openText: open[0],
      maxdepth: open[1] ? Number(open[1]) : DEFAULT_TOC_MAXDEPTH,
      closeEnd,
      regionEnd
    })
    cursor = regionEnd
  }
  return pairs
}

/** Headings run until the next toc marker or the next document title. */
function tocRegionEnd(content: string, closeEnd: number) {
  const nextOpen = content.slice(closeEnd).match(TOC_MARKER_RE)
  const limit = nextOpen?.index === undefined ? content.length : closeEnd + nextOpen.index
  let inFence = false
  let pos = closeEnd
  while (pos < limit) {
    const nl = content.indexOf('\n', pos)
    const lineEnd = nl === -1 || nl > limit ? limit : nl
    const line = content.slice(pos, lineEnd).replace(/\r$/, '')
    if (line.startsWith('```')) inFence = !inFence
    else if (!inFence && line.startsWith('# ')) return pos
    if (nl === -1 || nl >= limit) break
    pos = nl + 1
  }
  return limit
}

function tocItems(region: string, maxdepth: number, used: Map<string, number>) {
  const items: { level: number; text: string; slug: string }[] = []
  let inFence = false
  for (const line of region.split(/\r?\n/)) {
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
  return items
}

function tocBlock(openText: string, items: { level: number; text: string; slug: string }[]) {
  const min = items.length ? Math.min(...items.map((i) => i.level)) : 0
  const list = items.map((i) => `${'  '.repeat(i.level - min)}- [${i.text}](#${i.slug})`).join('\n')
  return list ? `${openText}\n\n${list}\n\n<!-- tocstop -->` : `${openText}\n\n<!-- tocstop -->`
}

export function insertToc(content: string): string {
  const pairs = tocPairs(content)
  if (!pairs.length) return content
  const used = new Map<string, number>()
  let cursor = 0
  let out = ''
  for (const pair of pairs) {
    const items = tocItems(content.slice(pair.closeEnd, pair.regionEnd), pair.maxdepth, used)
    out += content.slice(cursor, pair.openStart) + tocBlock(pair.openText, items)
    cursor = pair.closeEnd
  }
  return out + content.slice(cursor)
}

async function docsPagesList(folderAbs: string) {
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

  return groupOrder.map((group) => `### ${group}\n\n${groups.get(group)!.join('\n')}`).join('\n\n')
}

export async function insertDocsPages(content: string, folderAbs: string): Promise<string> {
  if (!DOCS_PAGES_RE.test(content)) return content
  const list = await docsPagesList(folderAbs)
  let cursor = 0
  let out = ''
  while (cursor < content.length) {
    const open = content.slice(cursor).match(DOCS_PAGES_RE)
    if (open?.index === undefined) break
    const openStart = cursor + open.index
    const afterOpen = openStart + open[0].length
    const close = content.slice(afterOpen).match(DOCS_PAGES_STOP_RE)
    if (close?.index === undefined) break
    const closeEnd = afterOpen + close.index + close[0].length
    const block = list
      ? `${open[0]}\n\n${list}\n\n<!-- docs-pagesstop -->`
      : `${open[0]}\n\n<!-- docs-pagesstop -->`
    out += content.slice(cursor, openStart) + block
    cursor = closeEnd
  }
  return out + content.slice(cursor)
}

export async function updateDocsToc({
  docsDir
}: UpdateDocsTocOptions): Promise<UpdateDocsTocResult> {
  const updated: string[] = []

  for (const file of await readdir(docsDir, { recursive: true })) {
    const path = join(docsDir, String(file))
    const rel = relative(docsDir, path).replaceAll('\\', '/')
    if (!(await isMarkdownFile(path)) || isSkippedPath(path) || rel.startsWith('scripts/')) continue

    const content = await Bun.file(path).text()
    const hasToc = TOC_MARKER_RE.test(content)
    const hasPages = DOCS_PAGES_RE.test(content)
    if (!hasToc && !hasPages) continue

    let next = content
    if (hasToc) next = insertToc(next)
    if (hasPages) next = await insertDocsPages(next, dirname(path))
    if (next === content) continue
    let current: string
    try {
      current = await Bun.file(path).text()
    } catch {
      continue
    }
    if (current !== content) continue
    await Bun.write(path, next)
    updated.push(path)
  }

  return { updated }
}

async function loadTocConfig(): Promise<TocEntry[]> {
  const raw = await Bun.file(TOC_JSON).json()
  if (!Array.isArray(raw)) throw new Error('docs/toc.json must be an array')
  return raw.map((e, i) => {
    if (!e || typeof e.folder !== 'string' || typeof e.title !== 'string') {
      throw new Error(`docs/toc.json[${i}] must have { folder, title } strings`)
    }
    if (e.html !== undefined && e.html !== false && e.html !== 'index') {
      throw new Error(`docs/toc.json[${i}].html must be false or "index"`)
    }
    return tocEntry(e)
  })
}

async function syncChangelogEntries(toc: TocEntry[]): Promise<TocEntry[]> {
  const next = toc.map(tocEntry)
  const changelog = next.find((e) => stripOrder(e.folder) === 'changelog')
  if (!changelog) return next

  const changelogDir = join(SRC, changelog.folder)
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
  const text = `${JSON.stringify(next, null, 2)}\n`
  const current = await Bun.file(TOC_JSON)
    .text()
    .catch(() => '')
  if (current !== text) {
    await Bun.write(TOC_JSON, text)
    console.log(`✓ toc.json (${entries.length} changelog entries)`)
  }
  return next
}

function pageHtml(
  title: string,
  body: string,
  extra?: { css: string; bodyClass: string },
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
      font-size: 24px;
      line-height: 32px;
      margin: 48px 0 16px;
    }
    .article h3 {
      font-size: 20px;
      line-height: 28px;
      margin: 32px 0 12px;
    }
    .article h4 {
      font-size: 16px;
      line-height: 24px;
      margin: 24px 0 8px;
    }
    .article h5 {
      font-size: 14px;
      line-height: 20px;
      margin: 0 0 24px;
    }
    .article p {
      margin: 0 0 16px;
      text-wrap: pretty;
    }
    .article ul,
    .article ol {
      margin: 0 0 16px;
      padding-inline-start: 1.5em;
      text-wrap: pretty;
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
    .article a,
    .article a:visited {
      color: #0000ee;
      text-underline-offset: 0.15em;
    }
    .article a:hover {
      text-decoration-thickness: 2px;
    }
    .article strong {
      font-weight: 700;
    }
    .article pre:not(.cadre) {
      padding: 1em;
    }
    .article pre[class*='language-'] {
      margin: 0 0 16px;
      border-radius: 0;
    }
    .article blockquote {
      margin: 0 0 16px;
    }
    .article blockquote > p:last-child {
      margin-bottom: 0;
    }
    .article :not(pre) > code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.875em;
    }
    .article .typeset-scroll {
      max-width: 100%;
      overflow-x: auto;
      margin: 0 0 16px;
    }
    .article table {
      width: 100%;
      border-collapse: collapse;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
      line-height: 20px;
      text-wrap: balance;
    }
    .article th,
    .article td {
      text-align: left;
      vertical-align: top;
      padding: 10px 24px 10px 0;
    }
    .article th {
      font-weight: 700;
      padding-bottom: 8px;
      border-bottom: 1px solid #d4d4d4;
    }
    .article td {
      font-weight: 400;
      border-bottom: 1px solid #ececec;
    }
    .article th:last-child,
    .article td:last-child {
      padding-right: 0;
    }
    .article :is(th, td) code {
      font-size: 14px;
      white-space: nowrap;
    }
    .article blockquote.alert {
      margin: 0 0 16px;
      padding: 2px 0 2px 16px;
      border-left: 2px solid #111;
    }
    .article blockquote.alert > p:first-child {
      margin: 0 0 4px;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
    }
    .article blockquote.alert > p:first-child strong {
      font-weight: 700;
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
      top: calc(0.45rem + 6px);
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
      top: calc(1.5rem + 6px);
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

export function headingIds(raw: string) {
  const pairs = tocPairs(raw)
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
    const inToc = pairs.some(
      (pair) => lineStart >= pair.closeEnd && lineStart < pair.regionEnd && level <= pair.maxdepth
    )
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
    (_, kind: string) =>
      `<blockquote class="alert">\n<p><strong>${ALERT_LABEL[kind]}</strong></p>\n<p>`
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

const DOC_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul'
])

// A leading backslash makes Bun emit one `&lt;`. An entity here would be escaped twice.
export function escapeUnknownTags(markdown: string) {
  return markdown
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((part, index) => (index % 2 === 1 ? part : escapeUnknownTagsInProse(part)))
    .join('')
}

function escapeUnknownTagsInProse(prose: string) {
  return prose.replace(
    /`[^`\n]*`|<\/?([A-Za-z][A-Za-z0-9-]*)\b[^>\n]*>/g,
    (full, name?: string) => {
      if (!name || DOC_HTML_TAGS.has(name.toLowerCase())) return full
      return full.replace('<', '\\<')
    }
  )
}

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
  unpublished: readonly string[],
  indexOnly: readonly string[],
  linkDir = fromDir
) {
  let html = highlightFences(Bun.markdown.html(escapeUnknownTags(raw), { autolinks: true }))
  const ids = headingIds(raw)
  const found = html.match(/<h[1-6]>/g)?.length ?? 0
  if (found !== ids.length) console.warn(`${label}: ${found} titres, ${ids.length} ancres`)
  html = applyHeadingIds(html, ids)
  html = applyImages(html)
  html = applyTables(html)
  html = applyAlerts(html)
  if (raw.includes('<!-- carl -->')) html = html.replaceAll('<!-- carl -->', benchHtml())
  return retargetMdLinks(
    rebaseLinks(rewriteUnpublishedLinks(html, fromDir, unpublished, indexOnly), linkDir, outDir)
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
  indexOnly: readonly string[],
  home = false
) {
  const raw = prepare(await Bun.file(mdAbs).text())
  if (!raw.trim()) return false
  const rel = relative(SRC, mdAbs).replaceAll('\\', '/')
  const base = rel.split('/').pop()!.replace(/\.md$/, '')
  const title = firstH1(raw, humanize(base.replace(/^\d{4}-\d{2}-\d{2}-/, '')))
  const hasBench = raw.includes('<!-- carl -->')
  const linkDir = dirname(join(ROOT, rel))
  const body = renderHtml(
    raw,
    dirname(mdAbs),
    dirname(outAbs),
    rel,
    unpublished,
    indexOnly,
    linkDir
  )
  await mkdir(dirname(outAbs), { recursive: true })
  await Bun.write(
    outAbs,
    pageHtml(
      title,
      home ? prefixSiteLinks(body) : body,
      hasBench ? { css: CARL_CSS, bodyClass: 'has-bench' } : undefined,
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

function isExistingFile(abs: string) {
  try {
    return statSync(abs).isFile()
  } catch {
    return false
  }
}

/** Relative `.md` links whose target file is absent. Fenced code is ignored. */
export function missingRelativeMdLinks(
  raw: string,
  fromDir: string,
  exists: (abs: string) => boolean
): string[] {
  const prose = raw
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .filter((_, index) => index % 2 === 0)
    .join('')
  const missing: string[] = []
  const seen = new Set<string>()
  for (const match of prose.matchAll(/\[[^\]]*\]\(([^)\s]+)/g)) {
    const url = match[1]!
    if (/^(?:[a-z]+:|#|\/\/)/i.test(url) || url.startsWith('/')) continue
    const hashAt = url.indexOf('#')
    const target = hashAt === -1 ? url : url.slice(0, hashAt)
    if (!target.endsWith('.md') || seen.has(target)) continue
    seen.add(target)
    if (!exists(join(fromDir, decodePath(target)))) missing.push(target)
  }
  return missing
}

async function warnMissingMdLinks() {
  for (const file of await readdir(SRC, { recursive: true })) {
    const abs = join(SRC, String(file))
    const rel = relative(SRC, abs).replaceAll('\\', '/')
    if (!(await isMarkdownFile(abs)) || isSkippedPath(abs) || rel.startsWith('scripts/')) continue
    if (await isOutsideDocs(abs)) continue
    const raw = await Bun.file(abs).text()
    for (const target of missingRelativeMdLinks(raw, dirname(abs), isExistingFile)) {
      console.warn(`${rel} → ${target}`)
    }
  }
}

export async function build() {
  const { updated } = await updateDocsToc({ docsDir: SRC })
  if (updated.length) {
    console.log(`✓ intra-file toc (${updated.length})`)
    for (const file of updated) console.log(`  - ${relative(ROOT, file)}`)
  }

  const toc = await syncChangelogEntries(await loadTocConfig())
  const unpublished = toc.filter((e) => e.html === false).map((e) => e.folder)
  const indexOnly = toc.filter((e) => e.html === 'index').map((e) => e.folder)

  await rm(SITE, { recursive: true, force: true })
  await rm(join(ROOT, 'index.html'), { force: true })
  let written = 0
  for (const file of await readdir(SRC, { recursive: true })) {
    const abs = join(SRC, String(file))
    if (!(await isMarkdownFile(abs)) || isSkippedPath(abs)) continue
    const rel = relative(SRC, abs).replaceAll('\\', '/')
    if (
      rel.startsWith('scripts/') ||
      rel.startsWith('site/') ||
      inFolder(rel, unpublished) ||
      notItsIndex(rel, indexOnly)
    )
      continue
    if (await isOutsideDocs(abs)) continue
    const home = rel === 'index.md'
    const out = home ? join(ROOT, 'index.html') : join(SITE, `${rel.slice(0, -3)}.html`)
    if (await renderPage(abs, out, unpublished, indexOnly, home)) written++
  }
  console.log(`✓ html (${written})`)
  await warnMissingMdLinks()
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
    rel.includes('/.')
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
      if (rel.includes('..')) return notFound()

      if (rel.startsWith('site/')) {
        const rest = rel.slice('site/'.length)
        if (!rest) return notFound()
        const location = `/${rest.split('/').map(encodeURIComponent).join('/')}`
        return Response.redirect(new URL(location, req.url).href, 302)
      }

      if (rel.endsWith('.md')) {
        const htmlRel = `${rel.slice(0, -3)}.html`
        if (!(await Bun.file(join(SITE, htmlRel)).exists())) return notFound()
        const location = `/${htmlRel.split('/').map(encodeURIComponent).join('/')}`
        return Response.redirect(new URL(location, req.url).href, 302)
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
  let again = false
  let quietUntil = 0

  async function rebuild(reason: string) {
    if (building) {
      again = true
      return
    }
    building = true
    let ok = false
    do {
      again = false
      console.log(`\n↻ ${reason}`)
      ok = false
      try {
        await build()
        ok = true
      } catch (err) {
        console.error('build failed:', err)
      }
      quietUntil = Date.now() + 300
    } while (again)
    building = false
    if (again) {
      void rebuild(reason)
      return
    }
    notify(ok)
  }

  return watch(ROOT, { recursive: true }, (_event, filename) => {
    if (!filename) {
      if (building || Date.now() < quietUntil) return
      clearTimeout(timer)
      timer = setTimeout(() => void rebuild('docs'), 150)
      return
    }
    const rel = toRel(String(filename))
    if (shouldIgnore(rel)) return
    if (building) {
      again = true
      return
    }
    clearTimeout(timer)
    timer = setTimeout(() => void rebuild(rel), 150)
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
