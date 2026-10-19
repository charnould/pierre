import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'

import microvmVersions from '../../../server/microvm/versions.json' with { type: 'json' }
import { fsyncPath, replaceSymlink } from './fs.ts'
import { expectSha256, verifyChecksumFile } from './github.ts'
import { CommandFailed, must, runCommand, type Context } from './system.ts'

function fsyncTree(path: string) {
  const stat = lstatSync(path)
  if (stat.isSymbolicLink()) return
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) fsyncTree(join(path, name))
  }
  fsyncPath(path)
}

function activateSmolvm(ctx: Context, release: string) {
  replaceSymlink(ctx.runtime.paths.smolvmRuntime, release)
  replaceSymlink(ctx.runtime.paths.smolvmBin, join(ctx.runtime.paths.smolvmRuntime, 'smolvm'))
}

async function assertSmolvmTree(ctx: Context, directory: string, expected: string) {
  const version = microvmVersions.smolvm.version
  const binary = join(directory, 'smolvm')
  if (!existsSync(binary)) throw new CommandFailed(1, 'Archive smolvm invalide.')
  const validated = await runCommand(ctx.runtime, binary, ['--version'])
  if (validated.code !== 0 || validated.stdout.trim() !== expected) {
    throw new CommandFailed(1, `Runtime smolvm ${version} invalide.`)
  }
  const checksumFile = join(directory, 'checksums.txt')
  if (!existsSync(checksumFile)) throw new CommandFailed(1, `Runtime smolvm ${version} invalide.`)
  await verifyChecksumFile(directory, await Bun.file(checksumFile).text())
}

export async function ensureSmolvm(ctx: Context) {
  const version = microvmVersions.smolvm.version
  const expected = `smolvm ${version}`
  const release = join(ctx.runtime.paths.smolvmReleases, version)
  mkdirSync(ctx.runtime.paths.smolvmReleases, { recursive: true, mode: 0o755 })

  if (!existsSync(release)) {
    const stage = mkdtempSync(join(ctx.runtime.paths.smolvmRoot, '.stage-'))
    const target = microvmVersions.smolvm['linux-amd64']
    const extracted = join(stage, `smolvm-${version}-linux-x86_64`)
    try {
      const archive = join(stage, 'smolvm.tar.gz')
      await ctx.runtime.download(target.url, archive)
      await expectSha256('smolvm.tar.gz', archive, target.sha256)
      await must(ctx.runtime, 'tar', ['-xzf', archive, '-C', stage])
      await assertSmolvmTree(ctx, extracted, expected)
      fsyncTree(extracted)
      renameSync(extracted, release)
      fsyncPath(ctx.runtime.paths.smolvmReleases)
    } finally {
      rmSync(stage, { recursive: true, force: true })
    }
  } else {
    await assertSmolvmTree(ctx, release, expected)
  }

  activateSmolvm(ctx, release)
}
