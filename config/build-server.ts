import { join } from 'node:path'

import { $ } from 'bun'

const ROOT = import.meta.dir.replace(/\/config$/, '')
const SERVER = join(ROOT, 'server')
const DIST = join(SERVER, 'assets/dist')
const EMBED = join(SERVER, 'assets/embed')
const DESKTOP = join(ROOT, 'desktop')

await $`rm -rf ${DIST}/css ${DIST}/js ${DIST}/assets ${DIST}/.vite`

await $`bun x --bun vite build --config ${join(DESKTOP, 'vite.chat-web.config.ts')}`.cwd(DESKTOP)

await Bun.write(
  join(DIST, 'css/pierre-embed-frame.css'),
  await Bun.file(join(EMBED, 'pierre-embed-frame.css')).text()
)
await Bun.write(
  join(DIST, 'css/pierre-embed-modal.css'),
  await Bun.file(join(EMBED, 'pierre-embed-modal.css')).text()
)

await $`bun build ${SERVER}/assets/host/pierre.ts --outfile ${join(DIST, 'js/pierre.js')} --minify --target browser --format=iife`
await $`bun build ${join(EMBED, 'pierre-embed.ts')} --outfile ${join(DIST, 'js/pierre-embed.js')} --minify --target browser --format=iife`
