import { watch } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const REPO = join(ROOT, '..')
const README = join(REPO, 'README.md')
const TOC_JSON = join(ROOT, 'toc.json')
const WATCH = process.argv.includes('--watch')

const README_TOC_START = '<!-- docs-toc -->'
const README_TOC_STOP = '<!-- docs-tocstop -->'
const TOC_MARKER_RE = /<!--\s*toc(?:\s+maxdepth:(\d+))?\s*-->/
const TOC_MARKER_GLOBAL_RE = /<!--\s*toc(?:\s+maxdepth:\d+)?\s*-->/g
const TOC_STOP_RE = /<!--\s*tocstop\s*-->/
const TOC_STOP_GLOBAL_RE = /<!--\s*tocstop\s*-->/g
const DEFAULT_TOC_MAXDEPTH = 3

type TocChangelogEntry = { slug: string; title: string; date: string }
export type TocEntry = { folder: string; title: string; entries?: TocChangelogEntry[] }

export type DocPage = {
  mdPath: string
  section: string
  date: string | null
  title: string
}

export type UpdateDocsTocOptions = { docsDir: string; dryRun?: boolean }
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

function isDecorativeHeading(text: string) {
  return /^[―—–-]+$/.test(text.trim())
}

function firstH1(raw: string, fallback: string) {
  const text = raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (text && !isDecorativeHeading(text)) return text
  return fallback
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
    let slug = githubSlug(text) || 'heading'
    const n = used.get(slug) ?? 0
    used.set(slug, n + 1)
    if (n > 0) slug = `${slug}-${n}`
    items.push({ level, text, slug })
  }

  const min = items.length ? Math.min(...items.map((i) => i.level)) : 0
  const list = items.map((i) => `${'  '.repeat(i.level - min)}- [${i.text}](#${i.slug})`).join('\n')
  const block = list
    ? `${openMatch[0]}\n\n${list}\n\n<!-- tocstop -->`
    : `${openMatch[0]}\n\n<!-- tocstop -->`

  return `${content.slice(0, openMatch.index)}${block}${after}`
}

export async function updateDocsToc({
  docsDir,
  dryRun = false
}: UpdateDocsTocOptions): Promise<UpdateDocsTocResult> {
  const updated: string[] = []
  const skipped: string[] = []

  for (const file of await readdir(docsDir, { recursive: true })) {
    const path = join(docsDir, String(file))
    const rel = relative(docsDir, path).replaceAll('\\', '/')
    if (!(await isMarkdownFile(path)) || isSkippedPath(path) || rel.startsWith('scripts/')) continue

    const content = await Bun.file(path).text()
    if (!TOC_MARKER_RE.test(content)) continue
    const tocCount = content.match(TOC_MARKER_GLOBAL_RE)?.length ?? 0
    const tocStopCount = content.match(TOC_STOP_GLOBAL_RE)?.length ?? 0
    if (tocCount > 1 || tocStopCount > 1) {
      skipped.push(path)
      continue
    }

    const next = insertToc(content)
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
    return { folder: e.folder, title: e.title }
  })
}

async function syncChangelogEntries(toc: TocEntry[]): Promise<TocEntry[]> {
  const next = toc.map((e) => ({ folder: e.folder, title: e.title }))
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
    if (!section) continue
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

function pageHtml(title: string, body: string) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${Bun.escapeHTML(title)} · PIERRE</title>
  <link rel="icon" href="./assets/favicon.ico" />
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
    .article code {
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
  </style>
</head>
<body>
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

async function renderMarkdown(raw: string) {
  const [{ default: MarkdownIt }, { default: MarkdownItGitHubAlerts }, { default: Shiki }] =
    await Promise.all([
      import('markdown-it'),
      import('markdown-it-github-alerts'),
      import('@shikijs/markdown-it')
    ])
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
  md.use(MarkdownItGitHubAlerts)
  md.use(await Shiki({ theme: 'github-light' }))
  const tableOpen = md.renderer.rules.table_open
  md.renderer.rules.table_open = (...args) =>
    `<div class="typeset-scroll">${tableOpen?.(...args) ?? '<table>'}`
  md.renderer.rules.table_close = () => '</table></div>'

  const headingOpen = md.renderer.rules.heading_open
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!
    let text = ''
    for (let i = idx + 1; i < tokens.length && tokens[i]!.type !== 'heading_close'; i++) {
      if (tokens[i]!.type === 'inline') text += tokens[i]!.content
    }
    const slug = githubSlug(text)
    if (slug) token.attrSet('id', slug)
    return headingOpen?.(tokens, idx, options, env, self) ?? self.renderToken(tokens, idx, options)
  }

  const image = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!
    const src = token.attrGet('src')
    const zoom = src?.endsWith('#zoom')
    if (zoom && src) {
      token.attrSet('src', src.slice(0, -'#zoom'.length))
      token.attrSet('data-zoomable', '')
    }
    const img = image?.(tokens, idx, options, env, self) ?? self.renderToken(tokens, idx, options)
    const title = token.content.trim()
    if (!title) return img
    return `<span class="shot"><span class="shot-title" aria-hidden="true">${Bun.escapeHTML(title)}</span>${img}</span>`
  }

  return md.render(raw)
}

async function buildLanding() {
  const raw = prepare(await Bun.file(join(ROOT, 'index.md')).text())
  const title = firstH1(raw, 'PIERRE')
  await Bun.write(join(ROOT, 'index.html'), pageHtml(title, await renderMarkdown(raw)))
  console.log('✓ index.html')
}

async function build() {
  const { updated, skipped } = await updateDocsToc({ docsDir: ROOT })
  if (updated.length) {
    console.log(`✓ intra-file toc (${updated.length})`)
    for (const file of updated) console.log(`  - ${relative(ROOT, file)}`)
  }
  if (skipped.length) {
    console.warn(`intra-file toc: skipped ${skipped.length} file(s) with multiple markers`)
  }

  const toc = await syncChangelogEntries(await loadTocConfig())
  const pages = await collectDocs(toc.map((e) => e.folder))
  await updateRootReadme(pages, toc)
  await buildLanding()
  console.log(`\n→ docs/index.html · README toc (${pages.length} pages)`)
}

function toRel(filename: string) {
  const abs = filename.startsWith('/') ? filename : join(ROOT, filename)
  return relative(ROOT, abs).replaceAll('\\', '/')
}

function shouldIgnore(rel: string) {
  return (
    rel.startsWith('..') ||
    rel === 'index.html' ||
    rel === 'node_modules' ||
    rel.startsWith('node_modules/') ||
    rel.startsWith('scripts/') ||
    rel.startsWith('.')
  )
}

if (import.meta.path === Bun.main) {
  await build()
  if (!WATCH) process.exit(0)

  const server = Bun.spawn(['bunx', 'serve', '.'], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit'
  })

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
    console.log(`\n↻ ${reason}`)
    try {
      await build()
    } catch (err) {
      console.error('build failed:', err)
    } finally {
      coolUntil = Date.now() + 400
      building = false
      if (pending) {
        const next = pending
        pending = undefined
        await rebuild(next)
      }
    }
  }

  const watcher = watch(ROOT, { recursive: true }, (_event, filename) => {
    if (!filename || Date.now() < coolUntil) return
    const rel = toRel(String(filename))
    if (shouldIgnore(rel) || !/\.(md|css|json)$/i.test(rel)) return
    clearTimeout(timer)
    timer = setTimeout(() => rebuild(rel), 150)
  })

  const shutdown = () => {
    watcher.close()
    server.kill()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  console.log('\nwatching docs/ …')
}
