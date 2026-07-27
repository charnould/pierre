import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { $ } from 'bun'
import toc from 'markdown-toc'

const ROOT = import.meta.dir.replace(/\/config$/, '')
const SERVER = join(ROOT, 'server')
const PIERRE_HOST = join(SERVER, 'assets/host')
const PIERRE_EMBED = join(SERVER, 'assets/embed')

const PIERRE_MODAL_SHELL_RADIUS = '12px'
const PIERRE_MODAL_SHADOW_REST =
  '0 2px 8px rgba(0, 0, 0, 0.04), 0 16px 48px -12px rgba(15, 23, 42, 0.18)'
const PIERRE_MODAL_NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
}

async function buildPierreEmbedModalCss(): Promise<string> {
  const css = await Bun.file(join(PIERRE_EMBED, 'pierre-embed-modal.css')).text()
  return minifyCss(css)
    .replaceAll('__NOISE_BG__', PIERRE_MODAL_NOISE_BG)
    .replaceAll('__SHELL_RADIUS__', PIERRE_MODAL_SHELL_RADIUS)
    .replaceAll('__SHADOW_REST__', PIERRE_MODAL_SHADOW_REST)
}

function assertPierreIife(path: string, code: string): void {
  const trimmed = code.trimStart()
  // Host/embed scripts run on third-party pages (jQuery, etc.). Minified top-level
  // `var $` / short globals must stay inside an IIFE — never leak to window.
  if (!/^\(?function\b|^!\s*function\b|^\(\s*\(\s*\)\s*=>/.test(trimmed)) {
    throw new Error(`${path} must be an IIFE (--format=iife) to avoid host global clashes`)
  }
}

function assertPierreHostMinified(pierrePath: string, pierre: string): void {
  if (pierre.includes('pierre_is_open') || pierre.includes('pierre-embed-modal')) {
    throw new Error(`${pierrePath} was not minified — check oxfmt/format-on-save`)
  }
  assertPierreIife(pierrePath, pierre)
}

function assertPierreEmbedMinified(pierreEmbedPath: string, pierreEmbed: string): void {
  if (pierreEmbed.includes('\nconst MODAL_ID')) {
    throw new Error(`${pierreEmbedPath} was not minified — check oxfmt/format-on-save`)
  }
  assertPierreIife(pierreEmbedPath, pierreEmbed)
}

// A timestamp used in filename to avoid caching issue (CSS + JS)
const timestamp = Date.now()

// Remove old files
await $`rm -rf ${SERVER}/assets/dist/css`
await $`rm -rf ${SERVER}/assets/dist/js`
await $`rm -f ${ROOT}/docs/assets/pierre.js`
await $`rm -f ${ROOT}/docs/assets/widget.js`
await $`find ${ROOT} -name ".DS_Store" -type f -delete`

// Read markdown under repo root and server/knowledge
const mdRoots = [ROOT, join(SERVER, 'knowledge')]
for (const mdRoot of mdRoots) {
  const files = await readdir(mdRoot, { recursive: true })
  for (const file of files) {
    const path = typeof file === 'string' ? join(mdRoot, file) : join(mdRoot, String(file))
    if (path.includes('node_modules') || !path.endsWith('.md')) continue
    const content = await Bun.file(path).text()
    const updated_content = toc.insert(content, {
      maxdepth: 3,
      slugify: function slugify(value: string) {
        return value
          .toLowerCase()
          .trim()
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
          .replace(/\s/g, '-')
          .replace(/-$/, '')
      }
    })
    await Bun.write(path, updated_content)
  }
}

// Compile production CSS file
await $`bunx @tailwindcss/cli@latest -i ${SERVER}/assets/tailwind/style.css -o ${SERVER}/assets/dist/css/style.${timestamp}.css --minify`

const embed_frame_css = minifyCss(
  await Bun.file(join(PIERRE_EMBED, 'pierre-embed-frame.css')).text()
)
await Bun.write(join(SERVER, 'assets/dist/css/pierre-embed-frame.css'), embed_frame_css)
await Bun.write(
  join(SERVER, 'assets/dist/css/pierre-embed-modal.css'),
  await buildPierreEmbedModalCss()
)

// Transpile and minify .ts/.tsx scripts into .js to work in browser.
await $`bun build ${SERVER}/assets/scripts/ai.tsx --outfile ${SERVER}/assets/dist/js/ai.${timestamp}.js --minify --target browser --production`
await $`bun build ${PIERRE_HOST}/pierre.ts --outfile ${SERVER}/assets/dist/js/pierre.js --minify --target browser --format=iife`
await $`bun build ${PIERRE_EMBED}/pierre-embed.ts --outfile ${SERVER}/assets/dist/js/pierre-embed.js --minify --target browser --format=iife`

const pierreDistPath = join(SERVER, 'assets/dist/js/pierre.js')
assertPierreHostMinified(pierreDistPath, await Bun.file(pierreDistPath).text())

const pierreEmbedDistPath = join(SERVER, 'assets/dist/js/pierre-embed.js')
assertPierreEmbedMinified(pierreEmbedDistPath, await Bun.file(pierreEmbedDistPath).text())

// Update "timestamped filepath" in all Views
const views = await readdir(join(SERVER, 'views'))

for (const view of views) {
  const viewPath = join(SERVER, 'views', view)
  const content = await Bun.file(viewPath).text()

  await Bun.write(
    viewPath,
    content
      .replace(/..\/assets\/dist\/js\/ai\.\d+\.js/, `../assets/dist/js/ai.${timestamp}.js`)
      .replace(
        /..\/assets\/dist\/css\/style\.\d+\.css/,
        `../assets/dist/css/style.${timestamp}.css`
      )
  )
}

// Copy pierre.js for the PIERRE website (docs)
await $`cp ${SERVER}/assets/dist/js/pierre.js ${ROOT}/docs/assets`

console.log(`✅ BUILD DONE!`)
