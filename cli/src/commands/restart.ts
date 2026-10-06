import { runCommand, waitForBody, type Context } from '../lib/system.ts'

export async function restart(ctx: Context): Promise<number> {
  const timeout = Number(ctx.runtime.env['PIERRE_RESTART_TIMEOUT'] || 90)
  await runCommand(ctx.runtime, 'systemctl', ['restart', 'pierre'])
  const margin = ctx.runtime.uiActive ? '  ' : ''
  ctx.runtime.writeOut(`${margin}Redémarrage en cours`)
  for (let attempt = 1; attempt <= timeout; attempt += 1) {
    const active = await runCommand(ctx.runtime, 'systemctl', ['is-active', 'pierre'])
    if (active.stdout.trim() !== 'active') break
    const ready = await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 1)
    if (ready) {
      ctx.runtime.writeOut(' terminé.\n')
      return 0
    }
    if (attempt % 5 === 0) ctx.runtime.writeOut('.')
    await ctx.runtime.sleep(1000)
  }
  ctx.runtime.writeOut(' échec.\n')
  const journal = await runCommand(ctx.runtime, 'journalctl', [
    '-u',
    'pierre',
    '-n',
    '30',
    '--no-pager'
  ])
  if (journal.stdout) ctx.runtime.writeErr(journal.stdout)
  if (journal.stderr) ctx.runtime.writeErr(journal.stderr)
  return 1
}
