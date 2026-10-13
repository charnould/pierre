import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runCommand, type Context } from '../lib/system.ts'

const JOURNAL_ARGS = [
  '-n',
  '200',
  '-f',
  '-u',
  'pierre',
  '-u',
  'caddy',
  '-o',
  'short-iso',
  '--no-pager'
]

export async function logs(ctx: Context): Promise<number> {
  const pager = ctx.runtime.tty && ctx.runtime.canPrompt && ctx.runtime.commandExists('less')
  if (!pager) {
    const child = ctx.runtime.start('journalctl', JOURNAL_ARGS, {
      inherit: true,
      env: { SYSTEMD_COLORS: ctx.runtime.tty ? '1' : '0' }
    })
    const previous = ctx.runtime.onInterrupt
    ctx.runtime.onInterrupt = () => child.kill()
    try {
      return (await child.finished).code
    } finally {
      ctx.runtime.onInterrupt = previous
    }
  }
  return viewWithPager(ctx)
}

async function viewWithPager(ctx: Context): Promise<number> {
  const { bold, cyan, dim, reset } = ctx.runtime.palette
  const directory = mkdtempSync(join(tmpdir(), 'pierre-logs-'))
  const file = join(directory, 'journal')
  writeFileSync(
    file,
    [
      `${cyan}${bold}Journaux PIERRE et Caddy${reset}`,
      `${dim}Ctrl+C quitte · ↑↓ défilent · / recherche · n poursuit · F reprend le direct${reset}`,
      '',
      ''
    ].join('\n')
  )
  const journal = ctx.runtime.start('journalctl', JOURNAL_ARGS, {
    stdoutFile: file,
    append: true,
    env: { SYSTEMD_COLORS: '1' }
  })
  let code = 0
  try {
    const pager = await runCommand(ctx.runtime, 'less', ['-R', '+F', file], { inherit: true })
    code = pager.code
  } finally {
    journal.kill()
    await journal.finished.catch(() => undefined)
    rmSync(directory, { recursive: true, force: true })
  }
  return code === 0 || code === 130 ? 0 : code
}
