import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { $ } from 'bun'
import toc from 'markdown-toc'

const ROOT = import.meta.dir.replace(/\/config$/, '')
const SERVER = join(ROOT, 'server')
const WIDGET_SCRIPTS = join(SERVER, 'assets/scripts')

const WIDGET_SHELL_RADIUS = '12px'
const WIDGET_SHADOW_REST = '0 2px 8px rgba(0, 0, 0, 0.04), 0 16px 48px -12px rgba(15, 23, 42, 0.18)'
const WIDGET_NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
}

async function generateWidgetStyles(): Promise<void> {
  const css = await Bun.file(join(WIDGET_SCRIPTS, 'widget.css')).text()
  const minified = minifyCss(css)
    .replaceAll('__NOISE_BG__', WIDGET_NOISE_BG)
    .replaceAll('__SHELL_RADIUS__', WIDGET_SHELL_RADIUS)
    .replaceAll('__SHADOW_REST__', WIDGET_SHADOW_REST)

  await Bun.write(
    join(WIDGET_SCRIPTS, 'widget.styles.gen.ts'),
    `export const WIDGET_CSS = ${JSON.stringify(minified)}\n`
  )
}

function assertWidgetMinified(widgetPath: string, widget: string): void {
  if (widget.includes('pierre_is_open') || widget.includes('\n.pierre-ia,\n')) {
    throw new Error(`${widgetPath} was not minified — check oxfmt/format-on-save`)
  }
}

// A timestamp used in filename to avoid caching issue (CSS + JS)
const timestamp = Date.now()

// Remove old files
await $`rm -rf ${SERVER}/assets/dist/css`
await $`rm -rf ${SERVER}/assets/dist/js`
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

await $`bun lint`
await $`bun format`

await generateWidgetStyles()

// Compile production CSS file
await $`bunx @tailwindcss/cli@latest -i ${SERVER}/assets/tailwind/style.css -o ${SERVER}/assets/dist/css/style.${timestamp}.css --minify`

// Transpile and minify .ts/.tsx scripts into .js to work in browser.
await $`bun build --entrypoints ${SERVER}/assets/scripts/ai.tsx ${SERVER}/assets/scripts/widget.ts --outdir ${SERVER}/assets/dist/js --minify --target browser`
await $`mv ${SERVER}/assets/dist/js/ai.js ${SERVER}/assets/dist/js/ai.${timestamp}.js`

const widgetDistPath = join(SERVER, 'assets/dist/js/widget.js')
assertWidgetMinified(widgetDistPath, await Bun.file(widgetDistPath).text())

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

// Copy transpiled/minified widget.js in `docs` folder, aka PIERRE website
await $`cp ${SERVER}/assets/dist/js/widget.js ${ROOT}/docs/assets`

assertWidgetMinified(
  join(ROOT, 'docs/assets/widget.js'),
  await Bun.file(join(ROOT, 'docs/assets/widget.js')).text()
)

console.log(`✅ BUILD DONE!`)
