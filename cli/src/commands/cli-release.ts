import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync
} from 'node:fs'
import { dirname, join } from 'node:path'

import {
  commandVersion,
  fetchReleases,
  fetchTo,
  selectCliRelease,
  verifyChecksum,
  versionGreater
} from '../lib/github.ts'
import type { Context } from '../lib/system.ts'
import { done, failed, say, spin } from '../lib/text.ts'

const CLI_ASSET = 'pierre-cli-linux-x64'

export async function stageCliUpdate(ctx: Context): Promise<'current' | 'updated' | 'failed'> {
  recoverInterruptedCliUpdate(ctx)
  const current = ctx.version
  const forced = ctx.runtime.env['PIERRE_CLI_UPDATE_TAG']
  const tag = forced || selectCliRelease(await fetchReleases(ctx))?.tag || ''
  if (!tag) {
    failed(ctx, 'Impossible de connaître la dernière version du cli.')
    return 'failed'
  }
  if (!versionGreater(tag, current)) {
    done(ctx, `${current} est déjà à jour.`)
    return 'current'
  }
  return (await installCliRelease(ctx, tag)) === 0 ? 'updated' : 'failed'
}

export async function updateCli(ctx: Context): Promise<number> {
  const staged = await stageCliUpdate(ctx)
  return staged === 'failed' ? 1 : 0
}

export async function installCliRelease(ctx: Context, tag: string): Promise<number> {
  const cmd = ctx.runtime.paths.cmd
  recoverInterruptedCliUpdate(ctx)
  const stage = mkdtempSync(join(dirname(cmd), '.pierre-cli-stage-'))
  const binary = join(stage, CLI_ASSET)
  const previous = `${cmd}.previous`
  let backedUp = false
  let replaced = false
  const cleanup = () => {
    rmSync(`${previous}.new`, { force: true })
    rmSync(`${cmd}.new`, { force: true })
    rmSync(stage, { recursive: true, force: true })
  }
  const previousInterrupt = ctx.runtime.onInterrupt
  ctx.runtime.onInterrupt = () => {
    restoreCli(cmd, previous, replaced)
    cleanup()
  }
  try {
    try {
      await spin(ctx, `cli ${tag}`, async () => {
        await fetchTo(ctx, CLI_ASSET, binary, tag)
        await fetchTo(ctx, 'checksums.txt', join(stage, 'checksums.txt'), tag)
        await verifyChecksum(readFileSync(join(stage, 'checksums.txt'), 'utf8'), CLI_ASSET, binary)
        if ((await commandVersion(ctx, binary)) !== tag) throw new Error('version')
      })
    } catch {
      failed(ctx, 'Le cli téléchargé est invalide. Le cli installé est inchangé.')
      return 1
    }
    try {
      if (existsSync(cmd)) {
        copyFileSync(cmd, `${previous}.new`)
        chmodSync(`${previous}.new`, 0o755)
        renameSync(`${previous}.new`, previous)
        backedUp = true
      }
      copyFileSync(binary, `${cmd}.new`)
      chmodSync(`${cmd}.new`, 0o755)
      renameSync(`${cmd}.new`, cmd)
      replaced = true
      if ((await commandVersion(ctx, cmd)) !== tag) throw new Error('confirm')
    } catch {
      restoreCli(cmd, previous, replaced)
      failed(
        ctx,
        backedUp
          ? 'Le cli n’a pas pu être remplacé. La version précédente est en place.'
          : 'Le cli n’a pas pu être installé.'
      )
      return 1
    }
    rmSync(previous, { force: true })
    replaced = false
    return 0
  } finally {
    ctx.runtime.onInterrupt = previousInterrupt
    cleanup()
  }
}

function recoverInterruptedCliUpdate(ctx: Context) {
  const cmd = ctx.runtime.paths.cmd
  const previous = `${cmd}.previous`
  if (!existsSync(previous)) return
  say(ctx, '  Restauration du cli interrompue.')
  restoreCli(cmd, previous, true)
}

function restoreCli(cmd: string, previous: string, replaced: boolean) {
  rmSync(`${cmd}.new`, { force: true })
  if (existsSync(previous)) {
    renameSync(previous, cmd)
    chmodSync(cmd, 0o755)
  } else if (replaced) {
    rmSync(cmd, { force: true })
  }
}
