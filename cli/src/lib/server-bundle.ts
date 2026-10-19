import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'

import type { Release } from '../../../shared/github-releases.ts'
import { fsyncPath, replaceSymlink } from './fs.ts'
import {
  assetDirectory,
  checksumFor,
  commandVersion,
  expectSha256,
  fetchRelease,
  fetchReleases,
  fetchTo,
  fileSha256,
  releaseParts,
  requireAssetSha256,
  selectServerRelease
} from './github.ts'
import { CommandFailed, type Context } from './system.ts'

export const SERVER_BINARY = 'pierre'
export const ONNX_LIBRARY = 'libonnxruntime.so.1'
export const MICROVM_IMAGE = 'pierre-linux-amd64.smolmachine'
export const SERVER_ASSETS = [SERVER_BINARY, ONNX_LIBRARY, MICROVM_IMAGE] as const

function requireFile(path: string, label: string) {
  if (!existsSync(path) || statSync(path).size === 0) {
    throw new CommandFailed(1, `${label} est absent ou vide.`)
  }
}

export function createServerStage(ctx: Context): string {
  mkdirSync(ctx.runtime.paths.serverReleases, { recursive: true, mode: 0o700 })
  return mkdtempSync(join(ctx.runtime.paths.serverRoot, '.stage-'))
}

export async function findServerRelease(ctx: Context): Promise<Release | null> {
  const forced = ctx.runtime.env['PIERRE_SERVER_TAG'] ?? ''
  if (forced) {
    if (!releaseParts(forced)) throw new CommandFailed(1, 'La version demandée est illisible.')
    return { tag: forced, draft: false, prerelease: false, assets: [] }
  }
  return selectServerRelease(await fetchReleases(ctx))
}

export async function stageServerBundle(ctx: Context, release: Release, directory: string) {
  const digests = await serverDigests(ctx, release)
  await Promise.all(
    SERVER_ASSETS.map((name) => fetchTo(ctx, name, join(directory, name), release.tag))
  )
  const binary = join(directory, SERVER_BINARY)
  chmodSync(binary, 0o755)
  chmodSync(join(directory, ONNX_LIBRARY), 0o644)
  chmodSync(join(directory, MICROVM_IMAGE), 0o644)
  for (const name of SERVER_ASSETS) {
    const file = join(directory, name)
    requireFile(file, name)
    const expected = digests.get(name)
    if (!expected) throw new CommandFailed(1, `Empreinte absente pour ${name}.`)
    await expectSha256(name, file, expected)
  }
  if ((await commandVersion(ctx, binary)) !== release.tag) {
    throw new CommandFailed(1, `Le binaire serveur n’annonce pas ${release.tag}.`)
  }
}

export async function publishServerBundle(ctx: Context, release: Release): Promise<string> {
  const stage = createServerStage(ctx)
  try {
    await stageServerBundle(ctx, release, stage)
    return await commitServerBundle(ctx, release.tag, stage)
  } catch (error) {
    rmSync(stage, { recursive: true, force: true })
    throw error
  }
}

export async function commitServerBundle(
  ctx: Context,
  tag: string,
  stage: string
): Promise<string> {
  const release = join(ctx.runtime.paths.serverReleases, tag)
  if (existsSync(release)) {
    for (const name of SERVER_ASSETS) {
      const staged = await fileSha256(join(stage, name))
      const installed = await fileSha256(join(release, name))
      if (staged !== installed) {
        throw new CommandFailed(1, `Le bundle installé ${tag} ne correspond pas à la release.`)
      }
    }
    rmSync(stage, { recursive: true, force: true })
    return release
  }
  for (const name of SERVER_ASSETS) fsyncPath(join(stage, name))
  fsyncPath(stage)
  renameSync(stage, release)
  fsyncPath(ctx.runtime.paths.serverReleases)
  return release
}

export function currentServerRelease(ctx: Context): string | null {
  try {
    return readlinkSync(ctx.runtime.paths.serverCurrent)
  } catch {
    return null
  }
}

export function serverInstalled(ctx: Context): boolean {
  const release = currentServerRelease(ctx)
  if (!release) return false
  return SERVER_ASSETS.every((name) => {
    try {
      return statSync(join(release, name)).size > 0
    } catch {
      return false
    }
  })
}

export function activateServerRelease(ctx: Context, release: string) {
  mkdirSync(ctx.runtime.paths.serverRoot, { recursive: true, mode: 0o700 })
  replaceSymlink(ctx.runtime.paths.serverCurrent, release)
}

async function serverDigests(ctx: Context, release: Release): Promise<Map<string, string>> {
  const local = assetDirectory(ctx)
  if (local) {
    const checksumFile = join(local, 'checksums.txt')
    requireFile(checksumFile, 'checksums.txt')
    const checksums = readFileSync(checksumFile, 'utf8')
    const digests = new Map<string, string>()
    for (const name of SERVER_ASSETS) {
      requireFile(join(local, name), name)
      digests.set(name, checksumFor(checksums, name))
    }
    return digests
  }
  const resolved = listedServerDigests(release) ? release : await fetchRelease(ctx, release.tag)
  return requireAssetSha256(resolved, SERVER_ASSETS)
}

function listedServerDigests(release: Release): boolean {
  const names = release.assets.map((asset) => asset.name).sort()
  if (names.join('\n') !== [...SERVER_ASSETS].sort().join('\n')) return false
  return release.assets.every((asset) => /^[a-f0-9]{64}$/.test(asset.sha256))
}
