import { rmSync } from 'node:fs'

import { runCommand, type Context } from '../lib/system.ts'
import { confirm, say } from '../lib/tui.ts'

export async function remove(ctx: Context): Promise<number> {
  const answer = await confirm(ctx, 'Continuer et supprimer toutes les données ?')
  if (answer === 2) return 1
  if (answer !== 0) {
    say(ctx, "Désinstallation annulée. Rien n'a été supprimé.")
    return 0
  }
  const { paths } = ctx.runtime
  await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'pierre', 'caddy'])
  await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'carl'])
  await deleteMachines(ctx)
  for (const file of [
    paths.envFile,
    paths.pendingEnvFile,
    paths.previousEnvFile,
    paths.installLog,
    paths.previousCaddyFile,
    paths.assetSourceFile,
    paths.smolvmBin,
    paths.unitFile,
    paths.carlUnit,
    paths.caddyFile
  ]) {
    rmSync(file, { force: true })
  }
  rmSync(paths.smolvmHome, { recursive: true, force: true })
  rmSync(paths.smolvmRoot, { recursive: true, force: true })
  rmSync('/root/.local/share/smolvm', { recursive: true, force: true })
  rmSync('/root/.local/bin/smolvm', { force: true })
  rmSync('/root/.cache/smolvm', { recursive: true, force: true })
  rmSync('/root/.cache/smolvm-pack', { recursive: true, force: true })
  rmSync('/root/.cache/smolvm-libs', { recursive: true, force: true })
  rmSync(paths.home, { recursive: true, force: true })
  await runCommand(ctx.runtime, 'systemctl', ['daemon-reload'])
  await runCommand(ctx.runtime, 'ldconfig', [])
  say(ctx, 'PIERRE et ses données ont été supprimés.')
  rmSync(paths.cmd, { force: true })
  return 0
}

async function deleteMachines(ctx: Context) {
  if (!ctx.runtime.commandExists('smolvm')) return
  const listed = await runCommand(ctx.runtime, 'smolvm', ['machine', 'ls', '--json'])
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
    names = []
  }
  for (const name of names) {
    await runCommand(ctx.runtime, 'smolvm', ['machine', 'stop', '--name', name])
    await runCommand(ctx.runtime, 'smolvm', ['machine', 'delete', '--name', name, '-f'])
  }
}
