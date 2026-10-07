import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runCommand, type Context } from '../lib/system.ts'
import { enterUi, leaveUi } from '../lib/tui.ts'

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

const HEADER = [
  '\u001b[1;36mJournaux PIERRE + Caddy\u001b[0m',
  '\u001b[2mCtrl+C suspend le direct · ↑↓/PageUp/PageDown défilent · / recherche',
  'n poursuit la recherche · F reprend le direct · q revient au menu\u001b[0m',
  '',
  ''
].join('\n')

async function viewWithPager(ctx: Context): Promise<number> {
  const directory = mkdtempSync(join(tmpdir(), 'pierre-logs-'))
  const file = join(directory, 'journal')
  writeFileSync(file, HEADER)
  const journal = ctx.runtime.start('journalctl', JOURNAL_ARGS, {
    stdoutFile: file,
    append: true,
    env: { SYSTEMD_COLORS: '1', SYSTEMD_COLORS_256: '1' }
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
  return code
}

export async function logs(ctx: Context, interactive = false): Promise<number> {
  const pager =
    interactive || (ctx.runtime.tty && ctx.runtime.canPrompt && ctx.runtime.commandExists('less'))
  if (!pager) {
    const child = ctx.runtime.start('journalctl', JOURNAL_ARGS, {
      inherit: true,
      env: { SYSTEMD_COLORS: '1', SYSTEMD_COLORS_256: '1' }
    })
    const previous = ctx.runtime.onInterrupt
    ctx.runtime.onInterrupt = () => child.kill()
    try {
      return (await child.finished).code
    } finally {
      ctx.runtime.onInterrupt = previous
    }
  }
  if (interactive) leaveUi(ctx.runtime)
  const code = await viewWithPager(ctx)
  if (interactive) enterUi(ctx.runtime)
  return code === 0 || code === 130 ? 0 : code
}
