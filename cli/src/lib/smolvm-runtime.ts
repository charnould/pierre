import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  mkdtempSync,
  lstatSync,
  openSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { dirname, join } from 'node:path'

import microvmVersions from '../../../server/microvm/versions.json' with { type: 'json' }
import { verifyChecksum } from './github.ts'
import { CommandFailed, must, runCommand, type Context } from './system.ts'

export type SmolvmState =
  | { kind: 'absent' }
  | { kind: 'legacy'; target: string }
  | { kind: 'versioned'; target: string }

export type PreparedSmolvm = {
  previous: SmolvmState
  release: string
}

export function currentSmolvmState(ctx: Context): SmolvmState {
  try {
    return { kind: 'versioned', target: readlinkSync(ctx.runtime.paths.smolvmRuntime) }
  } catch {
    try {
      return { kind: 'legacy', target: readlinkSync(ctx.runtime.paths.smolvmBin) }
    } catch {
      return { kind: 'absent' }
    }
  }
}

function swapSymlink(path: string, target: string) {
  const next = `${path}.new`
  rmSync(next, { force: true })
  symlinkSync(target, next)
  renameSync(next, path)
  fsyncParent(path)
}

function fsyncParent(path: string) {
  const directory = openSync(dirname(path), 'r')
  fsyncSync(directory)
  closeSync(directory)
}

function fsyncTree(path: string) {
  const stat = lstatSync(path)
  if (stat.isSymbolicLink()) return
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) fsyncTree(join(path, name))
  }
  const descriptor = openSync(path, 'r')
  fsyncSync(descriptor)
  closeSync(descriptor)
}

export function activateSmolvm(ctx: Context, release: string) {
  swapSymlink(ctx.runtime.paths.smolvmRuntime, release)
  swapSymlink(ctx.runtime.paths.smolvmBin, join(ctx.runtime.paths.smolvmRuntime, 'smolvm'))
}

export function restoreSmolvm(ctx: Context, state: SmolvmState) {
  if (state.kind === 'versioned') {
    activateSmolvm(ctx, state.target)
    return
  }
  rmSync(ctx.runtime.paths.smolvmRuntime, { force: true })
  fsyncParent(ctx.runtime.paths.smolvmRuntime)
  if (state.kind === 'legacy') swapSymlink(ctx.runtime.paths.smolvmBin, state.target)
  else {
    rmSync(ctx.runtime.paths.smolvmBin, { force: true })
    fsyncParent(ctx.runtime.paths.smolvmBin)
  }
}

export async function prepareSmolvm(ctx: Context): Promise<PreparedSmolvm> {
  const expected = `smolvm ${microvmVersions.smolvm.version}`
  const previous = currentSmolvmState(ctx)
  const release = join(ctx.runtime.paths.smolvmReleases, microvmVersions.smolvm.version)
  mkdirSync(ctx.runtime.paths.smolvmReleases, { recursive: true, mode: 0o755 })

  if (!existsSync(release)) {
    const stage = mkdtempSync(join(ctx.runtime.paths.smolvmRoot, '.stage-'))
    const archive = join(stage, 'smolvm.tar.gz')
    const target = microvmVersions.smolvm['linux-amd64']
    const extracted = join(stage, `smolvm-${microvmVersions.smolvm.version}-linux-x86_64`)
    try {
      await ctx.runtime.download(target.url, archive)
      await verifyChecksum(`${target.sha256}  smolvm.tar.gz`, 'smolvm.tar.gz', archive)
      await must(ctx.runtime, 'tar', ['-xzf', archive, '-C', stage])
      const candidate = join(extracted, 'smolvm')
      if (!existsSync(candidate)) throw new CommandFailed(1, 'Archive smolvm invalide.')
      const validated = await runCommand(ctx.runtime, candidate, ['--version'])
      if (validated.code !== 0 || validated.stdout.trim() !== expected) {
        throw new CommandFailed(1, `Archive smolvm ${microvmVersions.smolvm.version} invalide.`)
      }
      fsyncTree(extracted)
      renameSync(extracted, release)
      const releases = openSync(ctx.runtime.paths.smolvmReleases, 'r')
      fsyncSync(releases)
      closeSync(releases)
    } finally {
      rmSync(stage, { recursive: true, force: true })
    }
  }

  const validated = await runCommand(ctx.runtime, join(release, 'smolvm'), ['--version'])
  if (validated.code !== 0 || validated.stdout.trim() !== expected) {
    throw new CommandFailed(1, `Runtime smolvm ${microvmVersions.smolvm.version} invalide.`)
  }
  await must(ctx.runtime, 'bash', [
    '-c',
    'cd "$1" && sha256sum -c checksums.txt >/dev/null',
    'smolvm-check',
    release
  ])
  return { previous, release }
}

export async function ensureSmolvm(ctx: Context) {
  const prepared = await prepareSmolvm(ctx)
  activateSmolvm(ctx, prepared.release)
}
