import type { Context } from './system.ts'

const WORDMARK = [
  '  ██████╗ ██╗███████╗██████╗ ██████╗ ███████╗',
  '  ██╔══██╗██║██╔════╝██╔══██╗██╔══██╗██╔════╝',
  '  ██████╔╝██║█████╗  ██████╔╝██████╔╝█████╗',
  '  ██╔═══╝ ██║██╔══╝  ██╔══██╗██╔══██╗██╔══╝',
  '  ██║     ██║███████╗██║  ██║██║  ██║███████╗',
  '  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝'
]

const HELP: Array<[string, string]> = [
  ['install', 'Installe PIERRE sans le configurer'],
  ['configure', 'Paramètre le domaine'],
  ['update', 'Met à jour le programme, le serveur et le classement'],
  ['restart', 'Redémarre PIERRE'],
  ['backup', 'Sauvegarde la base'],
  ['logs', 'Affiche les journaux'],
  ['env', 'Affiche le domaine et les secrets d’authentification'],
  ['remove', 'Désinstalle PIERRE et ses données'],
  ['help', 'Affiche cette aide']
]

export type StatusLevel = 'ok' | 'warn' | 'bad'

export type StatusLine = {
  level: StatusLevel
  label: string
  value: string
  hint?: string
}

export type StatusUpdate = {
  label: string
  from: string
  to: string
}

const COLUMN = 12

function pad(text: string, width: number): string {
  const measured = [...text].length
  return `${text}${' '.repeat(Math.max(0, width - measured))}`
}

function truncate(text: string, width: number): string {
  const characters = [...text]
  if (characters.length <= width) return text
  if (width <= 1) return '…'
  return `${characters.slice(0, width - 1).join('')}…`
}

export function renderBrand(ctx: Context): string {
  const { bold, dim, reset } = ctx.runtime.palette
  return `\n  ${bold}◆  PIERRE${reset}  ${dim}${ctx.version}${reset}\n`
}

export function renderLogo(ctx: Context): string {
  const { bold, reset } = ctx.runtime.palette
  const mark = ctx.runtime.columns < 56 ? ['  ◆  PIERRE'] : WORDMARK
  return ['', ...mark.map((line) => `${bold}${line}${reset}`), ''].join('\n')
}

function renderCommands(ctx: Context): string {
  const { bold, dim, reset } = ctx.runtime.palette
  return HELP.map(
    ([verb, text]) => `     ${bold}${pad(verb, COLUMN)}${reset}${dim}${text}${reset}\n`
  ).join('')
}

export function renderHelp(ctx: Context): string {
  return `${renderBrand(ctx)}\n${renderCommands(ctx)}`
}

export function renderStatus(
  ctx: Context,
  lines: StatusLine[],
  updates: StatusUpdate[] = []
): string {
  const { dim, green, red, reset, yellow } = ctx.runtime.palette
  const mark = {
    ok: `${green}✓${reset}`,
    warn: `${yellow}!${reset}`,
    bad: `${red}×${reset}`
  }
  const rendered = lines.flatMap((line) => {
    const prefix = 6 + COLUMN
    const room = Math.max(8, ctx.runtime.columns - prefix)
    const text = truncate(line.value, room)
    const row = `  ${mark[line.level]}  ${dim}${pad(line.label, COLUMN)}${reset}${text}\n`
    if (!line.hint) return [row]
    return [
      row,
      `     ${dim}${truncate(line.hint, Math.max(8, ctx.runtime.columns - 5))}${reset}\n`
    ]
  })
  const notice = updates.length === 0 ? '' : `\n${renderUpdates(ctx, updates)}`
  return [renderLogo(ctx), '\n\n', ...rendered, notice, '\n', renderCommands(ctx), '\n'].join('')
}

function renderUpdates(ctx: Context, updates: StatusUpdate[]): string {
  const { bold, dim, reset } = ctx.runtime.palette
  const rows = updates.map((update) => `${pad(update.label, COLUMN)}${update.from} → ${update.to}`)
  const command = 'pierre update'
  const inner = Math.max(command.length, ...rows.map((row) => [...row].length)) + 4
  const rule = '─'.repeat(inner)
  const row = (text: string, strong = false) => {
    const gap = inner - [...text].length - 2
    const shown = strong ? `${bold}${text}${reset}` : text
    return `  ${dim}│${reset} ${shown}${' '.repeat(Math.max(0, gap))} ${dim}│${reset}\n`
  }
  return [
    `  ${dim}┌${rule}┐${reset}\n`,
    row(''),
    ...rows.map((text) => row(text)),
    row(''),
    row(command, true),
    row(''),
    `  ${dim}└${rule}┘${reset}\n`
  ].join('')
}
