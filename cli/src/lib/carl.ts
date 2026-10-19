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
import {
  assetDirectory,
  checksumFor,
  expectSha256,
  fetchReleases,
  fetchTo,
  selectCarlRelease
} from './github.ts'
import { CommandFailed, must, type Context } from './system.ts'

export type CarlInstall = 'current' | 'installed' | 'unchanged' | 'unavailable'
const SHA256 = /^[a-f0-9]{64}$/

function installedTag(dir: string): string {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp)) return ''
  const tag = readFileSync(stamp, 'utf8').trim()
  return tag && carlInstalled(dir, tag) ? tag : ''
}

async function modelSha256(ctx: Context, release: Release): Promise<string> {
  const local = assetDirectory(ctx)
  if (local) return checksumFor(readFileSync(join(local, 'checksums.txt'), 'utf8'), 'model.zip')
  const listed = release.assets.find((asset) => asset.name === 'model.zip')?.sha256 ?? ''
  if (SHA256.test(listed)) return listed
  throw new CommandFailed(1, 'Empreinte absente pour model.zip.')
}

async function installModel(ctx: Context, release: Release) {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  if (carlInstalled(dir, release.tag)) return
  const parent = join(ctx.runtime.paths.home, 'models')
  mkdirSync(parent, { recursive: true })
  const stage = mkdtempSync(join(parent, '.carl-'))
  const previous = `${dir}.previous`
  let staged = stage
  let moved = false
  try {
    const zip = join(stage, 'model.zip')
    const expected = await modelSha256(ctx, release)
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
  const release = selectCarlRelease(await fetchReleases(ctx))
  if (!release) return installedTag(dir) ? 'unchanged' : 'unavailable'
  if (carlInstalled(dir, release.tag)) return 'current'
  await installModel(ctx, release)
  return 'installed'
}
