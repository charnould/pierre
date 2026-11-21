import { printServiceFailure, waitForBody } from '../lib/server-service.ts'
import { type Context, must, runCommand } from '../lib/system.ts'
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
    await printServiceFailure(ctx)
    return 1
  }
}
