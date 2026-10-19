import { chmodSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  checksumFor,
  commandVersion,
  expectSha256,
  fetchReleases,
  fetchTo,
  releaseParts,
  selectCliRelease,
  versionGreater
} from '../lib/github.ts'
import { withInterrupt, type Context } from '../lib/system.ts'
import { done, failed, spin } from '../lib/text.ts'

const CLI_ASSET = 'pierre-cli-linux-x64'

export async function stageCliUpdate(ctx: Context): Promise<'current' | 'updated' | 'failed'> {
  const current = ctx.version
  const forced = ctx.runtime.env['PIERRE_CLI_TAG'] ?? ''
  if (forced && !releaseParts(forced)) {
    failed(ctx, 'La version demandée est illisible.')
    return 'failed'
  }
  let tag = forced
  if (!tag) {
    try {
      tag = selectCliRelease(await fetchReleases(ctx))?.tag ?? ''
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Impossible de connaître la dernière version du cli.'
      failed(ctx, message)
      return 'failed'
    }
  }
  if (!tag || !releaseParts(tag)) {
    failed(ctx, 'Impossible de connaître la dernière version du cli.')
    return 'failed'
  }
  if (!versionGreater(tag, current)) {
    done(ctx, `${current} est déjà à jour.`)
    return 'current'
  }
  return (await installCliRelease(ctx, tag)) === 0 ? 'updated' : 'failed'
}

export async function installCliRelease(ctx: Context, tag: string): Promise<number> {
  const cmd = ctx.runtime.paths.cmd
  const stage = mkdtempSync(join(dirname(cmd), '.pierre-cli-stage-'))
  const binary = join(stage, CLI_ASSET)
  const next = `${cmd}.new`
  let replaced = false
  const cleanup = () => {
    if (!replaced) rmSync(next, { force: true })
    rmSync(stage, { recursive: true, force: true })
  }
  return withInterrupt(ctx.runtime, cleanup, async () => {
    try {
      await spin(ctx, `cli ${tag}`, async () => {
        await fetchTo(ctx, CLI_ASSET, binary, tag)
        await fetchTo(ctx, 'checksums.txt', join(stage, 'checksums.txt'), tag)
        const checksums = await Bun.file(join(stage, 'checksums.txt')).text()
        await expectSha256(CLI_ASSET, binary, checksumFor(checksums, CLI_ASSET))
        chmodSync(binary, 0o755)
        if ((await commandVersion(ctx, binary)) !== tag) throw new Error('version')
      })
      rmSync(next, { force: true })
      await Bun.write(next, Bun.file(binary))
      chmodSync(next, 0o755)
      renameSync(next, cmd)
      replaced = true
      return 0
    } catch {
      failed(ctx, 'Le cli téléchargé est invalide. Le cli installé est inchangé.')
      return 1
    } finally {
      cleanup()
    }
  })
}
