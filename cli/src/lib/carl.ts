import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CARL_MODEL_FILES, carlInstalled } from '../../../shared/carl-model.ts'
import { fetchReleases, fetchTo, selectCarlRelease } from './github.ts'
import { CommandFailed, must, type Context } from './system.ts'
import { spin } from './text.ts'

function installedTag(dir: string): string {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp)) return ''
  const tag = readFileSync(stamp, 'utf8').trim()
  return tag && carlInstalled(dir, tag) ? tag : ''
}

async function installModel(ctx: Context, tag: string) {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  mkdirSync(dir, { recursive: true })
  if (carlInstalled(dir, tag)) return
  const temp = mkdtempSync(join(tmpdir(), 'pierre-carl-'))
  try {
    await fetchTo(ctx, 'model.zip', join(temp, 'model.zip'), tag)
    await must(ctx.runtime, 'unzip', ['-oq', join(temp, 'model.zip'), '-d', temp])
    rmSync(join(temp, 'model.zip'), { force: true })
    for (const name of CARL_MODEL_FILES) {
      if (!existsSync(join(temp, name))) {
        throw new CommandFailed(1, `L'archive ne contient pas ${name}.`)
      }
    }
    for (const entry of readdirSync(temp)) {
      cpSync(join(temp, entry), join(dir, entry), { recursive: true })
    }
    const stamp = join(dir, 'version')
    writeFileSync(stamp, `${tag}\n`)
    chmodSync(stamp, 0o644)
    rmSync(join(dir, 'model.sha256'), { force: true })
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

export async function ensureLatestCarl(
  ctx: Context,
  visible = false
): Promise<'current' | 'installed' | 'unavailable'> {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  const tag = selectCarlRelease(await fetchReleases(ctx))?.tag
  if (!tag) return installedTag(dir) ? 'current' : 'unavailable'
  if (carlInstalled(dir, tag)) return 'current'
  if (visible) await spin(ctx, 'Classement', () => installModel(ctx, tag))
  else await installModel(ctx, tag)
  return 'installed'
}
