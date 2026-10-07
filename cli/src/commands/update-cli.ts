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
import { say, sayError } from '../lib/tui.ts'

const CLI_ASSET = 'pierre-cli-linux-x64'

export async function updateCli(ctx: Context): Promise<number> {
  recoverInterruptedCliUpdate(ctx)
  const current = ctx.version
  const forced = ctx.runtime.env['PIERRE_CLI_UPDATE_TAG']
  const tag = forced || selectCliRelease(await fetchReleases(ctx))?.tag || ''
  if (!tag) {
    sayError(ctx, 'Impossible de connaître la dernière version du cli.')
    sayError(ctx, 'Vérifiez la connexion réseau, puis réessayez.')
    return 1
  }
  if (!versionGreater(tag, current)) {
    say(ctx, `${current} est déjà à jour.`)
    return 0
  }
  return installCliRelease(ctx, tag)
}

export async function installCliRelease(ctx: Context, tag: string): Promise<number> {
  const cmd = ctx.runtime.paths.cmd
  recoverInterruptedCliUpdate(ctx)
  const stage = mkdtempSync(join(dirname(cmd), '.pierre-cli-stage-'))
  const binary = join(stage, CLI_ASSET)
  const previous = `${cmd}.previous`
  let backedUp = false
  let replaced = false
  const onSignal = () => {
    restoreCli(cmd, previous, replaced)
    process.exit(130)
  }
  try {
    say(ctx, `Téléchargement du cli ${tag}…`)
    try {
      await fetchTo(ctx, CLI_ASSET, binary, tag)
      await fetchTo(ctx, 'checksums.txt', join(stage, 'checksums.txt'), tag)
    } catch {
      sayError(ctx, 'Le téléchargement a échoué. Le cli installé est inchangé.')
      return 1
    }
    try {
      verifyChecksum(readFileSync(join(stage, 'checksums.txt'), 'utf8'), CLI_ASSET, binary)
      if ((await commandVersion(ctx, binary)) !== tag) {
        throw new Error('version')
      }
    } catch {
      sayError(ctx, 'Le cli téléchargé est invalide. Le cli installé est inchangé.')
      return 1
    }
    process.on('SIGINT', onSignal)
    process.on('SIGTERM', onSignal)
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
      sayError(
        ctx,
        backedUp
          ? 'Le cli n’a pas pu être remplacé. La version précédente est en place.'
          : 'Le cli n’a pas pu être installé.'
      )
      return 1
    }
    rmSync(previous, { force: true })
    say(ctx, `${tag} est installé et opérationnel.`)
    return 0
  } finally {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    rmSync(`${previous}.new`, { force: true })
    rmSync(`${cmd}.new`, { force: true })
    rmSync(stage, { recursive: true, force: true })
  }
}

function recoverInterruptedCliUpdate(ctx: Context) {
  const cmd = ctx.runtime.paths.cmd
  const previous = `${cmd}.previous`
  if (!existsSync(previous)) return
  say(ctx, 'Restauration de la mise à jour cli interrompue…')
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
