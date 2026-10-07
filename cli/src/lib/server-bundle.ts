import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync
} from 'node:fs'
import { join } from 'node:path'

import {
  commandVersion,
  fetchTo,
  fileSha256,
  releaseAssetDigests,
  verifyChecksum,
  verifyFileDigest
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

function fsyncDirectory(path: string) {
  const directory = openSync(path, 'r')
  fsyncSync(directory)
  closeSync(directory)
}

export function createServerStage(ctx: Context): string {
  mkdirSync(ctx.runtime.paths.serverReleases, { recursive: true, mode: 0o700 })
  return mkdtempSync(join(ctx.runtime.paths.serverRoot, '.stage-'))
}

export async function stageServerBundle(ctx: Context, tag: string, directory: string) {
  const local = ctx.runtime.env['PIERRE_ASSET_DIR']
  let localChecksums = ''
  if (local) {
    for (const name of SERVER_ASSETS) requireFile(join(local, name), name)
    const checksumFile = join(local, 'checksums.txt')
    requireFile(checksumFile, 'checksums.txt')
    localChecksums = readFileSync(checksumFile, 'utf8')
  }
  const digests = await releaseAssetDigests(ctx, tag, [...SERVER_ASSETS])
  await Promise.all(SERVER_ASSETS.map((name) => fetchTo(ctx, name, join(directory, name), tag)))

  const binary = join(directory, SERVER_BINARY)
  const library = join(directory, ONNX_LIBRARY)
  const image = join(directory, MICROVM_IMAGE)
  chmodSync(binary, 0o755)
  chmodSync(library, 0o644)
  chmodSync(image, 0o644)
  requireFile(library, 'La bibliothèque ONNX')
  requireFile(image, "L'image microVM")

  for (const name of SERVER_ASSETS) {
    if (local) await verifyChecksum(localChecksums, name, join(directory, name))
    else await verifyFileDigest(name, join(directory, name), digests[name]!)
  }
  if ((await commandVersion(ctx, binary)) !== tag) {
    throw new CommandFailed(1, `Le binaire serveur n’annonce pas ${tag}.`)
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
  for (const name of SERVER_ASSETS) {
    const file = openSync(join(stage, name), 'r')
    fsyncSync(file)
    closeSync(file)
  }
  fsyncDirectory(stage)
  renameSync(stage, release)
  fsyncDirectory(ctx.runtime.paths.serverReleases)
  return release
}

export function currentServerRelease(ctx: Context): string | null {
  try {
    return readlinkSync(ctx.runtime.paths.serverCurrent)
  } catch {
    return null
  }
}

export function activateServerRelease(ctx: Context, release: string) {
  mkdirSync(ctx.runtime.paths.serverRoot, { recursive: true, mode: 0o700 })
  const next = `${ctx.runtime.paths.serverCurrent}.new`
  rmSync(next, { force: true })
  symlinkSync(release, next)
  renameSync(next, ctx.runtime.paths.serverCurrent)
  fsyncDirectory(ctx.runtime.paths.serverRoot)
}
