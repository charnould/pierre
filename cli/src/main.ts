import { backup } from './commands/backup.ts'
import { carl } from './commands/carl.ts'
import { configure } from './commands/configure.ts'
import { interactiveDashboard, showStatus } from './commands/dashboard.ts'
import { printEnv } from './commands/env.ts'
import { installCommand } from './commands/install.ts'
import { logs } from './commands/logs.ts'
import { remove } from './commands/remove.ts'
import { restart } from './commands/restart.ts'
import { updateCli } from './commands/update-cli.ts'
import { updateServer } from './commands/update-server.ts'
import { installationComplete } from './lib/config.ts'
import { renderHelp } from './lib/output.ts'
import { createRuntime, Exit, requireMachine, requireRoot, type Context } from './lib/system.ts'
import { CLI_VERSION } from './version.ts'

export async function run(argv: string[], ctx: Context): Promise<number> {
  const [command = '', argument = ''] = argv
  if (command === '--version') {
    ctx.runtime.writeOut(`${ctx.version}\n`)
    return 0
  }
  if (command === 'help' || command === '-h' || command === '--help') {
    ctx.runtime.writeOut(renderHelp(ctx))
    return 0
  }
  if (command === '') {
    if (!installationComplete(ctx.runtime)) {
      requireMachine(ctx.runtime)
      return installCommand(ctx)
    }
    requireRoot(ctx.runtime)
    if (ctx.runtime.tty && ctx.runtime.canPrompt) return interactiveDashboard(ctx)
    return showStatus(ctx)
  }
  if (command === 'install') {
    requireMachine(ctx.runtime)
    return installCommand(ctx)
  }
  requireRoot(ctx.runtime)
  switch (command) {
    case 'update':
      return updateServer(ctx)
    case 'update-cli':
      return updateCli(ctx)
    case 'carl':
      return carl(ctx, argument)
    case 'restart':
      return restart(ctx)
    case 'backup':
      return backup(ctx)
    case 'logs':
      return logs(ctx)
    case 'configure':
      return configure(ctx)
    case 'env':
      return printEnv(ctx)
    case 'remove':
      return remove(ctx)
    default:
      ctx.runtime.writeOut(renderHelp(ctx))
      return 1
  }
}

const entrypoint = import.meta.main

if (entrypoint) {
  const runtime = createRuntime()
  const ctx: Context = { runtime, version: CLI_VERSION }
  process.on('SIGINT', () => {
    runtime.onInterrupt?.()
    if (runtime.uiActive) runtime.writeOut('\u001b[?25h\u001b[?1049l')
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
