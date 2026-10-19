import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { runCommand, type Context } from '../lib/system.ts'
import { confirm, say, spin } from '../lib/text.ts'

export async function remove(ctx: Context): Promise<number> {
  const answer = await confirm(ctx, 'Continuer et supprimer toutes les données ?')
  if (answer === 2) return 1
  if (answer !== 0) {
    say(ctx, "Désinstallation annulée. Rien n'a été supprimé.")
    return 0
  }
  await spin(ctx, 'Suppression', async () => {
    const { paths } = ctx.runtime
    await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'pierre', 'caddy'])
    await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'carl'])
    await deleteMachines(ctx)
    for (const file of [
      paths.envFile,
      paths.installLog,
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
    rmSync(paths.home, { recursive: true, force: true })
    for (const leftover of smolvmResidue(paths.smolvmHome)) {
      rmSync(leftover, { recursive: true, force: true })
    }
    await runCommand(ctx.runtime, 'systemctl', ['daemon-reload'])
    await runCommand(ctx.runtime, 'ldconfig', [])
    rmSync(paths.cmd, { force: true })
  })
  return 0
}

function smolvmResidue(home: string): string[] {
  const root = dirname(home)
  return [
    join(root, '.local/share/smolvm'),
    join(root, '.local/bin/smolvm'),
    join(root, '.cache/smolvm'),
    join(root, '.cache/smolvm-pack'),
    join(root, '.cache/smolvm-libs')
  ]
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
