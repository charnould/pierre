import { backup } from './commands/backup.ts'
import { printEnv } from './commands/env.ts'
import { installCommand } from './commands/install.ts'
import { logs } from './commands/logs.ts'
import { remove } from './commands/remove.ts'
import { restart } from './commands/restart.ts'
import { showStatus } from './commands/status.ts'
import { update } from './commands/update.ts'
import { withPierreLock } from './lib/file-lock.ts'
import {
  createRuntime,
  Exit,
  Interrupted,
  requireMachine,
  requireRoot,
  type Context
} from './lib/system.ts'
import { sayError } from './lib/text.ts'
import { CLI_VERSION } from './version.ts'

export async function run(argv: string[], ctx: Context): Promise<number> {
  const [command = '', ...rest] = argv
  if (command === '--version') {
    ctx.runtime.writeOut(`${ctx.version}\n`)
    return 0
  }
  if (command === 'install') {
    requireMachine(ctx.runtime)
    return breathe(ctx, () => installCommand(ctx, rest))
  }
  requireRoot(ctx.runtime)
  switch (command) {
    case '':
      return showStatus(ctx)
    case 'update':
      return breathe(ctx, () => update(ctx, rest))
    case 'restart':
      return breathe(ctx, () => locked(ctx, () => restart(ctx)))
    case 'backup':
      return breathe(ctx, () => locked(ctx, () => backup(ctx)))
    case 'logs':
      return breathe(ctx, () => logs(ctx))
    case 'env':
      return printEnv(ctx)
    case 'remove':
      return breathe(ctx, () => locked(ctx, () => remove(ctx)))
    default:
      sayError(ctx, 'Commande inconnue.')
      return 2
  }
}

async function locked(ctx: Context, command: () => Promise<number>): Promise<number> {
  return (await withPierreLock(ctx, command)) ?? 1
}

async function breathe(ctx: Context, command: () => Promise<number>): Promise<number> {
  ctx.runtime.writeOut('\n')
  try {
    return await command()
  } finally {
    ctx.runtime.writeOut('\n')
  }
}

const entrypoint = import.meta.main

if (entrypoint) {
  const runtime = createRuntime()
  const ctx: Context = { runtime, version: CLI_VERSION }
  let interruptedCode: number | undefined
  const stop = (code: number) => {
    interruptedCode ??= code
    runtime.interrupt()
  }
  process.on('SIGINT', () => stop(130))
  process.on('SIGTERM', () => stop(143))
  run(process.argv.slice(2), ctx)
    .then((code) => {
      process.exitCode = interruptedCode ?? code
    })
    .catch((error: unknown) => {
      if (error instanceof Interrupted) {
        process.exitCode = interruptedCode ?? 1
        return
      }
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
