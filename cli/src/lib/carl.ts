import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'

import { CARL_MODEL_FILES, carlInstalled } from '../../../shared/carl-model.ts'
import { fetchReleases, fetchTo, selectCarlRelease } from './github.ts'
import { CommandFailed, must, type Context } from './system.ts'

export type CarlInstall = 'current' | 'installed' | 'unchanged' | 'unavailable'

function installedTag(dir: string): string {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp)) return ''
  const tag = readFileSync(stamp, 'utf8').trim()
  return tag && carlInstalled(dir, tag) ? tag : ''
}

async function installModel(ctx: Context, tag: string) {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  if (carlInstalled(dir, tag)) return
  const parent = join(ctx.runtime.paths.home, 'models')
  mkdirSync(parent, { recursive: true })
  const stage = mkdtempSync(join(parent, '.carl-'))
  const previous = `${dir}.previous`
  let staged = stage
  let moved = false
  try {
    await fetchTo(ctx, 'model.zip', join(stage, 'model.zip'), tag)
    await must(ctx.runtime, 'unzip', ['-oq', join(stage, 'model.zip'), '-d', stage])
    rmSync(join(stage, 'model.zip'), { force: true })
    for (const name of CARL_MODEL_FILES) {
      if (!existsSync(join(stage, name))) {
        throw new CommandFailed(1, `L'archive ne contient pas ${name}.`)
      }
    }
    rmSync(join(stage, 'model.sha256'), { force: true })
    const stamp = join(stage, 'version')
    writeFileSync(stamp, `${tag}\n`)
    chmodSync(stamp, 0o644)
    rmSync(previous, { recursive: true, force: true })
    if (existsSync(dir)) {
      renameSync(dir, previous)
      moved = true
    }
    renameSync(stage, dir)
    staged = ''
  } catch (error) {
    if (staged) rmSync(staged, { recursive: true, force: true })
    if (moved && !existsSync(dir) && existsSync(previous)) renameSync(previous, dir)
    throw error
  }
  rmSync(previous, { recursive: true, force: true })
}

export async function ensureLatestCarl(ctx: Context): Promise<CarlInstall> {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  const tag = selectCarlRelease(await fetchReleases(ctx))?.tag
  if (!tag) return installedTag(dir) ? 'unchanged' : 'unavailable'
  if (carlInstalled(dir, tag)) return 'current'
  await installModel(ctx, tag)
  return 'installed'
}
