import { waitForBody } from '../lib/server-service.ts'
import { must, runCommand, type Context } from '../lib/system.ts'
import { spin } from '../lib/text.ts'

export async function restart(ctx: Context): Promise<number> {
  const timeout = Number(ctx.runtime.env['PIERRE_RESTART_TIMEOUT'] || 90)
  try {
    await spin(ctx, 'Redémarrage', async () => {
      await must(ctx.runtime, 'systemctl', ['restart', 'pierre'])
      for (let attempt = 1; attempt <= timeout; attempt += 1) {
        const active = await runCommand(ctx.runtime, 'systemctl', ['is-active', 'pierre'])
        if (active.stdout.trim() !== 'active') break
        if (await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 1)) return
        await ctx.runtime.sleep(1000)
      }
      throw new Error('down')
    })
    return 0
  } catch {
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
}
