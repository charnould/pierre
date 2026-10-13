import { runCommand, type Context } from '../lib/system.ts'
import { stageCliUpdate } from './cli-release.ts'
import { updateServer } from './update-server.ts'

export async function update(ctx: Context): Promise<number> {
  if (ctx.runtime.env['PIERRE_UPDATE_HANDOFF'] !== '1') {
    const cli = await stageCliUpdate(ctx)
    if (cli === 'failed') return 1
    if (cli === 'updated') {
      const result = await runCommand(ctx.runtime, ctx.runtime.paths.cmd, ['update'], {
        env: { ...ctx.runtime.env, PIERRE_UPDATE_HANDOFF: '1' },
        inherit: true
      })
      return result.code
    }
  }
  return updateServer(ctx)
}
