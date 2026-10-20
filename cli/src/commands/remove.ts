import { existsSync, rmSync } from 'node:fs'

import { CommandFailed, must, runCommand, type Context } from '../lib/system.ts'
import { confirm, say, spin } from '../lib/text.ts'

const aptEnv = { DEBIAN_FRONTEND: 'noninteractive' }

export async function remove(ctx: Context): Promise<number> {
  const answer = await confirm(ctx, 'Continuer et supprimer PIERRE, Caddy et toutes les données ?')
  if (answer === 2) return 1
  if (answer !== 0) {
    say(ctx, "Désinstallation annulée. Rien n'a été supprimé.")
    return 0
  }
  try {
    await spin(ctx, 'Suppression', async () => {
      const { paths } = ctx.runtime
      if (existsSync(paths.unitFile)) {
        await must(ctx.runtime, 'systemctl', ['disable', '--now', 'pierre'])
      }
      if (ctx.runtime.commandExists('caddy')) {
        await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'caddy'])
      }
      await deleteMachines(ctx)
      await must(ctx.runtime, 'apt-get', ['purge', '-y', 'caddy'], { env: aptEnv })
      for (const file of [
        paths.envFile,
        paths.installLog,
        paths.assetSourceFile,
        paths.smolvmBin,
        paths.unitFile,
        paths.caddyFile,
        paths.caddyKeyFile,
        paths.caddyOwnerFile,
        paths.caddySourceFile
      ]) {
        rmSync(file, { force: true })
      }
      rmSync(paths.smolvmHome, { recursive: true, force: true })
      rmSync(paths.smolvmRoot, { recursive: true, force: true })
      rmSync(paths.home, { recursive: true, force: true })
      await must(ctx.runtime, 'systemctl', ['daemon-reload'])
      await must(ctx.runtime, 'ldconfig', [])
      rmSync(paths.cmd, { force: true })
    })
  } catch (error) {
    const output =
      error instanceof CommandFailed ? error.output : error instanceof Error ? error.message : ''
    if (output) ctx.runtime.writeErr(output.endsWith('\n') ? output : `${output}\n`)
    return 1
  }
  return 0
}

async function deleteMachines(ctx: Context) {
  if (!ctx.runtime.commandExists('smolvm')) return
  const { smolvmCache, smolvmData, smolvmHome } = ctx.runtime.paths
  const env = {
    HOME: smolvmHome,
    XDG_CACHE_HOME: smolvmCache,
    XDG_DATA_HOME: smolvmData
  }
  const listed = await must(ctx.runtime, 'smolvm', ['machine', 'ls', '--json'], { env })
  let names: string[] = []
  try {
    const parsed = JSON.parse(listed.stdout || '[]') as unknown
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { machines?: unknown }).machines)
        ? (parsed as { machines: unknown[] }).machines
        : []
    names = rows
      .map((row) => (row && typeof row === 'object' ? (row as { name?: unknown }).name : ''))
      .filter(
        (name): name is string => typeof name === 'string' && name.length > 0 && name !== 'null'
      )
  } catch {
    throw new CommandFailed(1, 'Liste des micro-VM illisible.')
  }
  for (const name of names) {
    await runCommand(ctx.runtime, 'smolvm', ['machine', 'stop', '--name', name], { env })
    await must(ctx.runtime, 'smolvm', ['machine', 'delete', '--name', name, '-f'], { env })
  }
}
