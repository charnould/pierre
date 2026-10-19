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
import type { Release } from '../../../shared/github-releases.ts'
import { assetSha256, expectSha256, fetchReleases, fetchTo, selectCarlRelease } from './github.ts'
import { CommandFailed, must, type Context } from './system.ts'

export type CarlInstall = {
  status: 'current' | 'installed' | 'unchanged' | 'unavailable'
  tag: string
}

function installedTag(dir: string): string {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp)) return ''
  const tag = readFileSync(stamp, 'utf8').trim()
  return tag && carlInstalled(dir, tag) ? tag : ''
}

async function installModel(ctx: Context, release: Release) {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  if (carlInstalled(dir, release.tag)) return
  const parent = join(ctx.runtime.paths.home, 'models')
  mkdirSync(parent, { recursive: true })
  const stage = mkdtempSync(join(parent, '.carl-'))
  try {
    const zip = join(stage, 'model.zip')
    const expected = await assetSha256(ctx, release.tag, 'model.zip', release)
    await fetchTo(ctx, 'model.zip', zip, release.tag)
    await expectSha256('model.zip', zip, expected)
    await must(ctx.runtime, 'unzip', ['-oq', zip, '-d', stage])
    rmSync(zip, { force: true })
    for (const name of CARL_MODEL_FILES) {
      if (!existsSync(join(stage, name))) {
        throw new CommandFailed(1, `L'archive ne contient pas ${name}.`)
      }
    }
    rmSync(join(stage, 'model.sha256'), { force: true })
    const stamp = join(stage, 'version')
    writeFileSync(stamp, `${release.tag}\n`)
    chmodSync(stamp, 0o644)
    const previous = join(parent, `.carl-previous-${crypto.randomUUID()}`)
    const hadCurrent = existsSync(dir)
    if (hadCurrent) renameSync(dir, previous)
    try {
      renameSync(stage, dir)
    } catch (error) {
      if (hadCurrent) renameSync(previous, dir)
      throw error
    }
    if (hadCurrent) rmSync(previous, { recursive: true, force: true })
  } catch (error) {
    rmSync(stage, { recursive: true, force: true })
    throw error
  }
}

export async function ensureLatestCarl(ctx: Context): Promise<CarlInstall> {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  const release = selectCarlRelease(await fetchReleases(ctx))
  if (!release) {
    const tag = installedTag(dir)
    return { status: tag ? 'unchanged' : 'unavailable', tag }
  }
  if (carlInstalled(dir, release.tag)) return { status: 'current', tag: release.tag }
  await installModel(ctx, release)
  return { status: 'installed', tag: release.tag }
}
