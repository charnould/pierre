import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import plugin, { externalSheets } from './build-plugin'

const DESKTOP = import.meta.dir
const ELECTRON_DIR = join(DESKTOP, 'electron')
const TSCONFIG = join(DESKTOP, 'tsconfig.json')

// Bun bakes import.meta.url as the TypeScript source path. Main and the mascot
// window live in electron/ and resolve preload, renderer and assets from the
// emitted file, which is dist/main/main.js. Point those calls at the CJS
// module filename so the path math still holds after packaging.
function pointDirnameAtOutput(source: string): string {
  return source.replaceAll(
    /(?:[\w$]+\.)?fileURLToPath\("(file:\/\/[^"]+)"\)/g,
    (full, url: string) => {
      let path: string
      try {
        path = fileURLToPath(url)
      } catch {
        return full
      }
      if (path !== ELECTRON_DIR && !path.startsWith(ELECTRON_DIR + sep)) return full
      return '__filename'
    }
  )
}

type BundleOptions = {
  outdir: string
  minify?: boolean
}

function posix(path: string): string {
  return path.split(sep).join('/')
}

async function buildNodeEntry(entry: string, outfile: string, minify: boolean) {
  const staging = await mkdtemp(join(tmpdir(), 'pierre-node-'))
  try {
    const result = await Bun.build({
      entrypoints: [entry],
      outdir: staging,
      target: 'node',
      format: 'cjs',
      external: ['electron'],
      splitting: false,
      packages: 'bundle',
      minify,
      tsconfig: TSCONFIG,
      root: dirname(entry),
      naming: '[name].[ext]'
    })
    const js = result.outputs.filter(
      (output) => output.kind !== 'sourcemap' && output.path.endsWith('.js')
    )
    const [file, ...extra] = js
    if (!file || extra.length > 0) {
      const produced = js.map((output) => output.path).join(', ')
      throw new Error(`${basename(entry)} produced ${produced || 'no JavaScript'}`)
    }
    await mkdir(dirname(outfile), { recursive: true })
    await Bun.write(outfile, pointDirnameAtOutput(await file.text()))
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

export async function buildMain({ outdir, minify = false }: BundleOptions) {
  await rm(outdir, { recursive: true, force: true })
  await buildNodeEntry(join(DESKTOP, 'electron/main.ts'), join(outdir, 'main.js'), minify)
}

export async function buildPreloads({ outdir, minify = false }: BundleOptions) {
  await rm(outdir, { recursive: true, force: true })
  await buildNodeEntry(join(DESKTOP, 'preload/index.ts'), join(outdir, 'index.js'), minify)
  await buildNodeEntry(join(DESKTOP, 'preload/mascot.ts'), join(outdir, 'mascot.js'), minify)
}

export async function buildRenderer({ outdir, minify = false }: BundleOptions) {
  await rm(outdir, { recursive: true, force: true })
  await Bun.build({
    entrypoints: [join(DESKTOP, 'index.html'), join(DESKTOP, 'mascot.html')],
    outdir,
    target: 'browser',
    minify,
    splitting: true,
    plugins: [plugin],
    tsconfig: TSCONFIG,
    root: DESKTOP,
    naming: {
      entry: '[name].[ext]',
      chunk: 'chunks/[name]-[hash].[ext]',
      asset: 'assets/[name]-[hash].[ext]'
    }
  })
  for (const name of ['index.html', 'mascot.html']) {
    const path = join(outdir, name)
    const html = await Bun.file(path).text()
    // file:// rejects crossorigin module scripts. Electron loads these pages that way.
    await Bun.write(path, html.replaceAll(' crossorigin', ''))
  }
}

export async function buildChat(outdir: string) {
  const { plugin: chatPlugin, sheets } = externalSheets()
  const result = await Bun.build({
    entrypoints: [join(DESKTOP, 'src/chat-web/main.tsx')],
    outdir,
    target: 'browser',
    minify: true,
    splitting: true,
    plugins: [chatPlugin],
    tsconfig: TSCONFIG,
    root: DESKTOP,
    naming: {
      entry: 'js/[name]-[hash].[ext]',
      chunk: 'js/[name]-[hash].[ext]',
      asset: 'assets/[name]-[hash].[ext]'
    }
  })

  if (sheets.length === 0) {
    throw new Error('chat build produced no stylesheet')
  }

  const cssFiles: string[] = []
  for (const sheet of sheets) {
    const cssPath = join(outdir, 'css', sheet.cssName)
    await mkdir(dirname(cssPath), { recursive: true })
    await Bun.write(cssPath, sheet.css)
    cssFiles.push(posix(relative(outdir, cssPath)))
    for (const asset of sheet.assets) {
      await Bun.write(join(outdir, 'assets', asset.name), asset.bytes)
    }
  }

  const produced = result.outputs
    .filter((output) => output.kind !== 'sourcemap')
    .map((output) => ({
      kind: output.kind,
      file: posix(relative(outdir, output.path))
    }))
  const js = produced.find((file) => file.kind === 'entry-point' && file.file.endsWith('.js'))
  if (!js) {
    throw new Error(`chat build missing js: ${JSON.stringify(produced)}`)
  }

  const manifest = {
    'src/chat-web/main.tsx': {
      file: js.file,
      isEntry: true as const,
      css: cssFiles
    }
  }
  await Bun.write(join(outdir, 'manifest.json'), JSON.stringify(manifest))
  return manifest
}

if (import.meta.main) {
  await buildMain({ outdir: join(DESKTOP, 'dist/main'), minify: true })
  await buildPreloads({ outdir: join(DESKTOP, 'dist/preload'), minify: true })
  await buildRenderer({ outdir: join(DESKTOP, 'dist/renderer'), minify: true })
}
