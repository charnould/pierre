import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'

import { fsyncPath, replaceSymlink } from './fs.ts'
import {
  assetDirectory,
  assetSha256,
  commandVersion,
  expectSha256,
  fetchRelease,
  fetchReleases,
  fetchTo,
  fileSha256,
  releaseParts,
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

export async function findServerRelease(ctx: Context): Promise<string | null> {
  const forced = ctx.runtime.env['PIERRE_SERVER_TAG'] ?? ''
  if (forced) {
    if (!releaseParts(forced)) throw new CommandFailed(1, 'La version demandée est illisible.')
    return forced
  }
  return selectServerRelease(await fetchReleases(ctx))?.tag ?? null
}

export async function stageServerBundle(ctx: Context, tag: string, directory: string) {
  const digests = await serverDigests(ctx, tag)
  await Promise.all(SERVER_ASSETS.map((name) => fetchTo(ctx, name, join(directory, name), tag)))
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
  if ((await commandVersion(ctx, binary)) !== tag) {
    throw new CommandFailed(1, `Le binaire serveur n’annonce pas ${tag}.`)
  }
}

export async function publishServerBundle(ctx: Context, tag: string): Promise<string> {
  const stage = createServerStage(ctx)
  try {
    await stageServerBundle(ctx, tag, stage)
    return await commitServerBundle(ctx, tag, stage)
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

async function serverDigests(ctx: Context, tag: string): Promise<Map<string, string>> {
  const known = assetDirectory(ctx) ? undefined : await fetchRelease(ctx, tag)
  const digests = new Map<string, string>()
  for (const name of SERVER_ASSETS) digests.set(name, await assetSha256(ctx, tag, name, known))
  return digests
}
