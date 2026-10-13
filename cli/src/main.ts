import { backup } from './commands/backup.ts'
import { configure } from './commands/configure.ts'
import { printEnv } from './commands/env.ts'
import { installCommand } from './commands/install.ts'
import { logs } from './commands/logs.ts'
import { remove } from './commands/remove.ts'
import { restart } from './commands/restart.ts'
import { showStatus } from './commands/status.ts'
import { update } from './commands/update.ts'
import { renderHelp } from './lib/output.ts'
import { createRuntime, Exit, requireMachine, requireRoot, type Context } from './lib/system.ts'
import { CLI_VERSION } from './version.ts'

export async function run(argv: string[], ctx: Context): Promise<number> {
  const [command = '', ...rest] = argv
  if (command === '--version') {
    ctx.runtime.writeOut(`${ctx.version}\n`)
    return 0
  }
  if (command === 'help' || command === '-h' || command === '--help') {
    ctx.runtime.writeOut(renderHelp(ctx))
    return 0
  }
  if (command === 'install') {
    requireMachine(ctx.runtime)
    return installCommand(ctx)
  }
  requireRoot(ctx.runtime)
  switch (command) {
    case '':
      return showStatus(ctx)
    case 'update':
      return update(ctx)
    case 'restart':
      return restart(ctx)
    case 'backup':
      return backup(ctx)
    case 'logs':
      return logs(ctx)
    case 'configure':
      return configure(ctx, rest)
    case 'env':
      return printEnv(ctx)
    case 'remove':
      return remove(ctx)
    default:
      ctx.runtime.writeOut(renderHelp(ctx))
      return 2
  }
}

const entrypoint = import.meta.main

if (entrypoint) {
  const runtime = createRuntime()
  const ctx: Context = { runtime, version: CLI_VERSION }
  process.on('SIGINT', () => {
    runtime.onInterrupt?.()
    process.exit(130)
  })
  run(process.argv.slice(2), ctx)
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      if (error instanceof Exit) {
        if (error.message) runtime.writeErr(`${error.message}\n`)
        process.exitCode = error.code
        return
      }
      const message = error instanceof Error ? error.message : 'Erreur inattendue.'
      runtime.writeErr(`${message}\n`)
      process.exitCode = 1
    })
}
