import { describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildChat, buildMain, buildPreloads, buildRenderer } from './build'
import { compileCss } from './build-plugin'

const DESKTOP = import.meta.dir

// Five percent above the cold graph measured after splitting settings, activity and tasks:
// entry 589096, modulepreload 482599, globals CSS 214052, main preload 11779.
const COLD_ENTRY_MAX_BYTES = 618_551
const COLD_MODULEPRELOAD_MAX_BYTES = 506_729
const COLD_GLOBALS_MAX_BYTES = 224_755
const MAIN_PRELOAD_MAX_BYTES = 12_368

function quotedAttr(tag: string, name: string): string | undefined {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]
}

function coldAssets(html: string): { entry: string; preloads: string[] } {
  const tags = html.match(/<(?:script|link)\b[^>]*>/g) ?? []
  let entry = ''
  const preloads: string[] = []
  for (const tag of tags) {
    if (tag.startsWith('<script') && quotedAttr(tag, 'type') === 'module') {
      entry = quotedAttr(tag, 'src') ?? entry
    }
    if (tag.startsWith('<link') && quotedAttr(tag, 'rel') === 'modulepreload') {
      const href = quotedAttr(tag, 'href')
      if (href) preloads.push(href)
    }
  }
  if (!entry) throw new Error('renderer entry script missing')
  return { entry, preloads }
}

async function tempDir(prefix: string) {
  return mkdtemp(join(tmpdir(), prefix))
}

describe('electron bundles', () => {
  it('emits one CommonJS main file that leaves electron to the runtime', async () => {
    const outdir = await tempDir('pierre-main-')
    try {
      await buildMain({ outdir, minify: true })
      expect(await readdir(outdir)).toEqual(['main.js'])
      const source = await Bun.file(join(outdir, 'main.js')).text()
      expect(source).toMatch(/require\(["']electron["']\)/)
      expect(source).not.toMatch(/^\s*import\s/m)
      expect(source).not.toMatch(/^\s*export\s/m)
      expect(source).not.toContain('import.meta')
      expect(source).not.toContain('electron/main.ts')
      expect(source).not.toContain('electron/mascot-window.ts')
      expect(source).not.toContain('electron/ipc/system')
      expect(source).toMatch(/dirname\(__filename\)/)
      expect(source).not.toMatch(/\.__filename/)
      expect(source).toContain('electron-log')
      expect(source).not.toMatch(/require\(\s*["']\.\.?[/\\]/)
    } finally {
      await rm(outdir, { recursive: true, force: true })
    }
  })

  it('emits two preload files and no shared chunk', async () => {
    const outdir = await tempDir('pierre-preload-')
    try {
      await buildPreloads({ outdir, minify: true })
      expect((await readdir(outdir)).sort()).toEqual(['index.js', 'mascot.js'])
      expect((await stat(join(outdir, 'index.js'))).size).toBeLessThanOrEqual(
        MAIN_PRELOAD_MAX_BYTES
      )
      for (const name of ['index.js', 'mascot.js']) {
        const source = await Bun.file(join(outdir, name)).text()
        expect(source).toMatch(/require\(["']electron["']\)/)
        expect(source).not.toMatch(/require\(\s*["']\.\.?[/\\]/)
        expect(source).not.toContain('import.meta')
      }
    } finally {
      await rm(outdir, { recursive: true, force: true })
    }
  })

  it('emits both renderer pages with relative scripts', async () => {
    const outdir = await tempDir('pierre-renderer-')
    try {
      await buildRenderer({ outdir, minify: true })
      for (const name of ['index.html', 'mascot.html']) {
        const html = await Bun.file(join(outdir, name)).text()
        const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].flatMap((match) =>
          match[1] ? [match[1]] : []
        )
        expect(srcs.length).toBeGreaterThan(0)
        for (const src of srcs) {
          expect(src.startsWith('./') || src.startsWith('../')).toBe(true)
        }
        expect(html).not.toContain('crossorigin')
      }
      const files = await readdir(outdir, { recursive: true })
      const css = files.find((file) => file.endsWith('.css'))
      const font = files.find((file) => file.endsWith('.woff2'))
      expect(css).toBeTruthy()
      expect(font).toBeTruthy()

      const { entry, preloads } = coldAssets(await Bun.file(join(outdir, 'index.html')).text())
      expect(preloads.length).toBeGreaterThan(0)
      expect((await stat(join(outdir, entry))).size).toBeLessThanOrEqual(COLD_ENTRY_MAX_BYTES)
      const preloadBytes = await Promise.all(
        preloads.map(async (href) => (await stat(join(outdir, href))).size)
      )
      expect(preloadBytes.reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(
        COLD_MODULEPRELOAD_MAX_BYTES
      )
      const coldJs = (
        await Promise.all([entry, ...preloads].map((href) => Bun.file(join(outdir, href)).text()))
      ).join('\n')
      const styles = [
        ...new Set(
          [...coldJs.matchAll(/href="(\.\/assets\/[^"]+\.css)"/g)].flatMap((match) =>
            match[1] ? [match[1]] : []
          )
        )
      ]
      expect(styles).toHaveLength(1)
      expect(styles[0]).toContain('globals-')
      expect((await stat(join(outdir, styles[0]!))).size).toBeLessThanOrEqual(
        COLD_GLOBALS_MAX_BYTES
      )
      expect(coldJs).not.toContain('Fermer les notifications')
      expect(coldJs).not.toContain('Mes tâches et tâches assignées')
      expect(coldJs).not.toContain('Copier le texte')
      expect(coldJs).not.toContain('Cette action est immédiate.')
    } finally {
      await rm(outdir, { recursive: true, force: true })
    }
  }, 180_000)
})

describe('tailwind', () => {
  it('compiles the public theme without leaving Tailwind directives', async () => {
    const css = await compileCss(join(DESKTOP, 'src/chat-web/theme.css'))
    expect(css).not.toContain("@import 'tailwindcss'")
    expect(css).not.toContain('@import "tailwindcss"')
    expect(css).not.toContain('@theme')
    expect(css).toContain('--font-sans-features')
  }, 60_000)

  it('includes a class that exists only in an explicit @source', async () => {
    const fixture = join(DESKTOP, `.css-fixture-${crypto.randomUUID()}`)
    try {
      await mkdir(join(fixture, 'pages'), { recursive: true })
      await Bun.write(join(fixture, 'pages/page.html'), '<div class="bg-lime-500"></div>')
      await Bun.write(
        join(fixture, 'in.css'),
        '@import "tailwindcss" source(none);\n@source "./pages";\n'
      )
      const css = await compileCss(join(fixture, 'in.css'))
      expect(css).toContain('.bg-lime-500')
    } finally {
      await rm(fixture, { recursive: true, force: true })
    }
  })
})

describe('chat manifest', () => {
  it('records a hashed entry and its stylesheet', async () => {
    const outdir = await tempDir('pierre-chat-')
    try {
      const manifest = await buildChat(outdir)
      const entry = manifest['src/chat-web/main.tsx']
      const css = entry?.css?.[0]
      expect(entry?.isEntry).toBe(true)
      expect(entry?.file).toMatch(/^js\/.+-[A-Za-z0-9_-]{8,}\.js$/)
      expect(css).toMatch(/-[A-Za-z0-9_-]{8,}\.css$/)
      expect(entry?.file).toBeTruthy()
      expect(css).toBeTruthy()
      if (!entry || !css) return
      expect(await Bun.file(join(outdir, entry.file)).exists()).toBe(true)
      const cssFile = Bun.file(join(outdir, css))
      expect(await cssFile.exists()).toBe(true)
      const cssText = await cssFile.text()
      const font = cssText.match(/url\("(\.\.\/assets\/[^"]+\.woff2)"\)/)
      expect(font?.[1]).toBeTruthy()
      if (!font?.[1]) return
      expect(await Bun.file(join(outdir, 'css', font[1])).exists()).toBe(true)
    } finally {
      await rm(outdir, { recursive: true, force: true })
    }
  }, 180_000)
})
