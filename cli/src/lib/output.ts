import type { Context } from './system.ts'

export const PROJECT_URL = 'https://pierre-ia.org'
export const CODE_URL = 'https://github.com/charnould/pierre'

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
  const { cyan, dim, reset } = ctx.runtime.palette
  return `\n  ${cyan}◆  PIERRE${reset}  ${dim}${ctx.version}${reset}\n`
}

export function renderLogo(ctx: Context): string {
  const { cyan, dim, reset } = ctx.runtime.palette
  const mark = ctx.runtime.columns < 56 ? ['  ◆  PIERRE'] : WORDMARK
  return [
    '',
    ...mark.map((line) => `${cyan}${line}${reset}`),
    `  ${dim}${ctx.version}${reset}`,
    ''
  ].join('\n')
}

export function renderHelp(ctx: Context): string {
  const { cyan, dim, reset } = ctx.runtime.palette
  return `${renderBrand(ctx)}\n${HELP.map(
    ([verb, text]) => `  ${cyan}${verb.padEnd(12)}${reset}  ${dim}${text}${reset}\n`
  ).join('')}`
}

export function renderStatus(
  ctx: Context,
  lines: StatusLine[],
  updates: StatusUpdate[] = []
): string {
  const { cyan, dim, green, red, reset, yellow } = ctx.runtime.palette
  const mark = { ok: `${green}✓${reset}`, warn: `${yellow}!${reset}`, bad: `${red}×${reset}` }
  const labelWidth = 16
  const rendered = lines.flatMap((line) => {
    const prefix = 6 + labelWidth
    const room = Math.max(8, ctx.runtime.columns - prefix)
    const text = truncate(line.value, room)
    const row = `  ${mark[line.level]}  ${dim}${pad(line.label, labelWidth)}${reset}${text}\n`
    if (!line.hint) return [row]
    return [
      row,
      `     ${dim}${truncate(line.hint, Math.max(8, ctx.runtime.columns - 5))}${reset}\n`
    ]
  })
  const links = [
    ['Projet', PROJECT_URL],
    ['Code', CODE_URL]
  ].map(([label, url]) => `  ${dim}${pad(label ?? '', labelWidth)}${reset}${cyan}${url}${reset}\n`)
  return [renderLogo(ctx), '\n', ...rendered, renderUpdates(ctx, updates), '\n', ...links].join('')
}

function renderUpdates(ctx: Context, updates: StatusUpdate[]): string {
  if (updates.length === 0) return ''
  const { dim, reset, yellow } = ctx.runtime.palette
  const width = Math.max(...updates.map((update) => [...update.label].length))
  const rows = updates.map(
    (update) => `     ${dim}${pad(update.label, width)}${reset}  ${update.from} → ${update.to}\n`
  )
  return [
    `\n  ${yellow}↑${reset}  ${dim}MISE À JOUR${reset}\n`,
    ...rows,
    `     ${dim}pierre update${reset}\n`
  ].join('')
}

export function providerLabel(type: string): string {
  return type === 'openai' ? 'OpenAI' : type === 'anthropic' ? 'Anthropic' : type
}
