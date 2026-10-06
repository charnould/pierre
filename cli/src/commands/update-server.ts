import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync
} from 'node:fs'
import { dirname, join } from 'node:path'

import {
  commandVersion,
  fetchReleases,
  selectServerRelease,
  versionGreater
} from '../lib/github.ts'
import { prepareServerFiles, stageServerBundle } from '../lib/server-bundle.ts'
import { CommandFailed, must, runCommand, waitForBody, type Context } from '../lib/system.ts'
import { say, sayError } from '../lib/tui.ts'

export async function updateServer(ctx: Context): Promise<number> {
  const { bin, envFile } = ctx.runtime.paths
  if (!existsSync(envFile) || !existsSync(bin)) {
    sayError(ctx, "PIERRE n'est pas installé sur cette machine.")
    return 1
  }
  if (!(await recoverInterruptedServerUpdate(ctx))) return 1
  const current = await commandVersion(ctx, bin)
  const forced = ctx.runtime.env['PIERRE_UPDATE_TAG']
  const latest = forced || selectServerRelease(await fetchReleases(ctx))?.tag || ''
  if (!latest) {
    sayError(ctx, 'Impossible de connaître la dernière version stable.')
    sayError(ctx, 'Vérifiez la connexion réseau, puis réessayez.')
    return 1
  }
  if (!versionGreater(latest, current)) {
    say(ctx, `${current} est déjà à jour.`)
    return 0
  }
  return installServerRelease(ctx, latest)
}

function previousDirectory(ctx: Context) {
  return `${ctx.runtime.paths.bin}.previous`
}

function backupServer(ctx: Context) {
  const previous = previousDirectory(ctx)
  const temporary = `${previous}.new`
  rmSync(temporary, { recursive: true, force: true })
  mkdirSync(temporary, { mode: 0o700 })
  copyFileSync(ctx.runtime.paths.bin, join(temporary, 'pierre'))
  copyFileSync(ctx.runtime.paths.so, join(temporary, 'libonnxruntime.so.1'))
  chmodSync(join(temporary, 'pierre'), 0o755)
  chmodSync(join(temporary, 'libonnxruntime.so.1'), 0o644)
  renameSync(temporary, previous)
}

async function replaceServer(ctx: Context, dir: string) {
  const { bin, so } = ctx.runtime.paths
  prepareServerFiles(ctx, dir)
  await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
  renameSync(`${so}.new`, so)
  renameSync(`${bin}.new`, bin)
  await must(ctx.runtime, 'ldconfig', [])
}

async function restoreServer(ctx: Context, dir: string) {
  const { bin, so } = ctx.runtime.paths
  await runCommand(ctx.runtime, 'systemctl', ['stop', 'pierre'])
  copyFileSync(join(dir, 'pierre'), `${bin}.new`)
  copyFileSync(join(dir, 'libonnxruntime.so.1'), `${so}.new`)
  chmodSync(`${bin}.new`, 0o755)
  chmodSync(`${so}.new`, 0o644)
  renameSync(`${so}.new`, so)
  renameSync(`${bin}.new`, bin)
  rmSync(`${bin}.new`, { force: true })
  rmSync(`${so}.new`, { force: true })
  await must(ctx.runtime, 'ldconfig', [])
  await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
  if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
    throw new CommandFailed(1, 'La version restaurée ne répond pas.')
  }
  rmSync(dir, { recursive: true, force: true })
}

async function recoverInterruptedServerUpdate(ctx: Context): Promise<boolean> {
  const previous = previousDirectory(ctx)
  if (!existsSync(previous)) return true
  say(ctx, 'Restauration de la mise à jour serveur interrompue…')
  try {
    await restoreServer(ctx, previous)
    return true
  } catch {
    sayError(ctx, `La restauration automatique a échoué. Sauvegarde conservée : ${previous}`)
    return false
  }
}

async function waitForStableServer(ctx: Context) {
  if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) return false
  await ctx.runtime.sleep(10_000)
  const active = await runCommand(ctx.runtime, 'systemctl', ['is-active', 'pierre'])
  return (
    active.stdout.trim() === 'active' &&
    (await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 1))
  )
}

export async function installServerRelease(ctx: Context, tag: string): Promise<number> {
  if (!(await recoverInterruptedServerUpdate(ctx))) return 1
  const stage = mkdtempSync(join(dirname(ctx.runtime.paths.bin), '.pierre-server-stage-'))
  const previous = previousDirectory(ctx)
  let backedUp = false
  let restoring = false
  const onSignal = () => {
    if (restoring) return
    restoring = true
    const restore = backedUp ? restoreServer(ctx, previous) : Promise.resolve()
    void restore.finally(() => process.exit(130))
  }
  try {
    say(ctx, `Téléchargement de PIERRE ${tag}…`)
    try {
      await stageServerBundle(ctx, tag, stage)
    } catch {
      sayError(ctx, 'La release est incomplète ou invalide. Aucun fichier n’a été remplacé.')
      return 1
    }
    say(ctx, 'Serveur et bibliothèque vérifiés.')
    try {
      backupServer(ctx)
      backedUp = true
    } catch {
      sayError(ctx, 'La sauvegarde de la version installée a échoué.')
      return 1
    }
    process.on('SIGINT', onSignal)
    process.on('SIGTERM', onSignal)
    say(ctx, 'Installation du serveur…')
    try {
      await replaceServer(ctx, stage)
      const restarted = await runCommand(ctx.runtime, 'systemctl', ['restart', 'pierre'])
      const healthy = restarted.code === 0 && (await waitForStableServer(ctx))
      if (!healthy) throw new CommandFailed(1, 'unhealthy')
    } catch {
      try {
        await restoreServer(ctx, previous)
        sayError(ctx, 'Le nouveau serveur n’a pas démarré. La version précédente a été restaurée.')
      } catch {
        sayError(ctx, `Le rollback a échoué. Sauvegarde conservée : ${previous}`)
      }
      return 1
    }
    rmSync(previous, { recursive: true, force: true })
    say(ctx, `${tag} est installé et opérationnel.`)
    return 0
  } finally {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    rmSync(stage, { recursive: true, force: true })
  }
}
