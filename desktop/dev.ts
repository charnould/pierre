import { watch } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { buildMain, buildPreloads } from './build'
import { DEV_ASSETS } from './build-plugin'
import index from './index.html'
import mascot from './mascot.html'

const DESKTOP = import.meta.dir

export async function startRenderer(port = 0) {
  await mkdir(DEV_ASSETS, { recursive: true })
  return Bun.serve({
    port,
    routes: {
      '/': index,
      '/mascot.html': mascot,
      '/assets/*': { dir: DEV_ASSETS }
    },
    development: {
      hmr: true,
      console: false
    }
  })
}

async function rebuildMain() {
  await buildMain({ outdir: join(DESKTOP, 'dist/main') })
  await buildPreloads({ outdir: join(DESKTOP, 'dist/preload') })
}

function watchSources(onChange: () => void) {
  for (const dir of ['electron', 'preload', 'src/shared']) {
    watch(join(DESKTOP, dir), { recursive: true }, () => onChange())
  }
}

async function main() {
  const server = await startRenderer()
  const rendererUrl = server.url.origin
  let child: Bun.Subprocess | null = null
  let stopping = false
  let pending = false
  let queued = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const restart = async () => {
    const previous = child
    child = null
    previous?.kill()
    await previous?.exited
    if (stopping) return
    child = Bun.spawn({
      cmd: [process.execPath, 'x', 'electron', '.'],
      cwd: DESKTOP,
      env: { ...process.env, ELECTRON_RENDERER_URL: rendererUrl },
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit'
    })
  }

  const reload = async () => {
    if (pending) {
      queued = true
      return
    }
    pending = true
    try {
      await rebuildMain()
      await restart()
    } catch (error) {
      console.error(error)
    } finally {
      pending = false
      if (queued) {
        queued = false
        timer = setTimeout(() => void reload(), 80)
      }
    }
  }

  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => void reload(), 80)
  }

  watchSources(schedule)
  await reload()
  console.log(rendererUrl)

  const shutdown = () => {
    stopping = true
    clearTimeout(timer)
    child?.kill()
    server.stop(true)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

if (import.meta.main) {
  await main()
}
