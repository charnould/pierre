import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'

import { transformSync } from 'oxc-transform-react'

const DESKTOP = import.meta.dir
const REPO = join(DESKTOP, '..')
export const DEV_ASSETS = join(tmpdir(), 'pierre-desktop-dev-assets')

const assetPaths = new Map<string, string>()

function inNodeModules(path: string): boolean {
  return /[/\\]node_modules[/\\]/.test(path)
}

function langOf(path: string): 'jsx' | 'tsx' {
  return path.endsWith('.tsx') ? 'tsx' : 'jsx'
}

/** Tailwind 4.3.3 via its CLI, so @theme, @source and package CSS stay intact. */
export async function compileCss(input: string, minify = false): Promise<string> {
  const cmd = [process.execPath, 'x', '@tailwindcss/cli', '--silent', '-i', input]
  if (minify) cmd.push('--minify')

  const proc = Bun.spawn({
    cmd,
    cwd: DESKTOP,
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ])
  if (exit !== 0) {
    throw new Error(stderr.trim() || `tailwindcss exited ${exit} for ${input}`)
  }
  if (!stdout.trim()) {
    throw new Error(`tailwindcss produced no CSS for ${input}`)
  }
  return stdout
}

async function findAsset(spec: string, cssFile: string): Promise<string> {
  const clean = spec.split('?')[0]?.split('#')[0] ?? spec
  const cached = assetPaths.get(clean)
  if (cached) return cached

  const relative = join(dirname(cssFile), clean)
  if (await Bun.file(relative).exists()) {
    assetPaths.set(clean, relative)
    return relative
  }

  const inFonts = join(DESKTOP, 'src/assets/fonts', basename(clean))
  if (await Bun.file(inFonts).exists()) {
    assetPaths.set(clean, inFonts)
    return inFonts
  }

  const suffix = clean.replace(/^\.?\//, '')
  const glob = new Bun.Glob(`**/${suffix}`)
  for await (const file of glob.scan({ cwd: join(REPO, 'node_modules/.bun'), absolute: true })) {
    assetPaths.set(clean, file)
    return file
  }

  throw new Error(`CSS asset not found: ${spec} from ${cssFile}`)
}

function contentHash(bytes: Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(bytes).digest('base64url').slice(0, 8)
}

export type EmittedSheet = {
  cssName: string
  css: string
  assets: { name: string; bytes: Uint8Array }[]
}

const URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

async function relocateUrls(
  css: string,
  cssFile: string,
  urlPrefix: string
): Promise<{ css: string; assets: { name: string; bytes: Uint8Array }[] }> {
  const assets: { name: string; bytes: Uint8Array }[] = []
  const names = new Map<string, string>()
  let next = css

  for (const match of css.matchAll(URL_PATTERN)) {
    const token = match[0]
    const spec = match[2]
    if (
      !spec ||
      spec.startsWith('data:') ||
      spec.startsWith('http:') ||
      spec.startsWith('https:')
    ) {
      continue
    }
    let name = names.get(spec)
    if (!name) {
      const path = await findAsset(spec, cssFile)
      const bytes = await Bun.file(path).bytes()
      const ext = extname(path)
      const stem = basename(path, ext)
      name = `${stem}-${contentHash(bytes)}${ext}`
      names.set(spec, name)
      assets.push({ name, bytes })
    }
    next = next.replaceAll(token, `url("${urlPrefix}${name}")`)
  }

  return { css: next, assets }
}

function linkModule(href: string): string {
  return `if (!document.querySelector(${JSON.stringify(`link[rel="stylesheet"][href="${href}"]`)})) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ${JSON.stringify(href)};
  document.head.appendChild(link);
}
`
}

function createPierrePlugin(mode: 'document' | 'external') {
  const sheets: EmittedSheet[] = []

  const plugin: Bun.BunPlugin = {
    name: 'pierre',
    setup(build) {
      const minify = build.config.minify === true
      const assetDir = build.config.outdir ? join(build.config.outdir, 'assets') : DEV_ASSETS

      build.onLoad({ filter: /\.css$/ }, async (args) => {
        if (inNodeModules(args.path)) return undefined
        const compiled = await compileCss(args.path, minify)
        if (mode === 'external') {
          const relocated = await relocateUrls(compiled, args.path, '../assets/')
          const cssName = `${basename(args.path, '.css')}-${contentHash(new TextEncoder().encode(relocated.css))}.css`
          sheets.push({ cssName, css: relocated.css, assets: relocated.assets })
          return { contents: 'export {}', loader: 'js' }
        }

        const relocated = await relocateUrls(compiled, args.path, './')
        const cssName = `${basename(args.path, '.css')}-${contentHash(new TextEncoder().encode(relocated.css))}.css`
        await mkdir(assetDir, { recursive: true })
        await Bun.write(join(assetDir, cssName), relocated.css)
        for (const asset of relocated.assets) {
          await Bun.write(join(assetDir, asset.name), asset.bytes)
        }
        return { contents: linkModule(`./assets/${cssName}`), loader: 'js' }
      })

      build.onLoad({ filter: /\.[jt]sx$/ }, async (args) => {
        if (inNodeModules(args.path)) return undefined
        const source = await Bun.file(args.path).text()
        const lang = langOf(args.path)
        const result = transformSync(args.path, source, {
          lang,
          jsx: 'preserve',
          reactCompiler: true
        })
        if (result.fatal) {
          const detail = result.errors.map((error) => error.message).join('\n')
          throw new Error(detail || `React compiler failed for ${args.path}`)
        }
        return { contents: result.code, loader: lang }
      })
    }
  }

  return { plugin, sheets }
}

const documentBuild = createPierrePlugin('document')

export default documentBuild.plugin
export const externalSheets = () => createPierrePlugin('external')
