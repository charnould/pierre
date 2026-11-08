import { withPierreLock } from '../lib/file-lock.ts'
import { type Context, runCommand } from '../lib/system.ts'
import { stageCliUpdate } from './cli-release.ts'
import { updateServer } from './update-server.ts'

export async function update(ctx: Context, argv: string[] = []): Promise<number> {
  const reset = argv.includes('--reset')
  if (!argv.includes('--server')) {
    const cli = await withPierreLock(ctx, () => stageCliUpdate(ctx))
    if (cli === null || cli === 'failed') return 1
    if (cli === 'updated') {
      const args = ['update', '--server', ...(reset ? ['--reset'] : [])]
      const result = await runCommand(ctx.runtime, ctx.runtime.paths.cmd, args, {
        env: ctx.runtime.env,
        inherit: true
      })
      return result.code
    }
  }
  return (await withPierreLock(ctx, () => updateServer(ctx, reset))) ?? 1
}
