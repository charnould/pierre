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
  ['install', 'Installe les services'],
  ['update', "Met à jour l'ensemble des services"],
  ['restart', "Redémarre l'ensemble des services"],
  ['backup', 'Sauvegarde la base de données'],
  ['logs', 'Affiche les journaux'],
  ['env', 'Affiche le domaine et les secrets d’authentification'],
  ['remove', "Supprime l'ensemble des services et des données"]
]

export type StatusLevel = 'ok' | 'warn' | 'bad'

export type StatusLine = {
  level: StatusLevel
  label: string
  value: string
  next?: string
  hint?: string
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

export function renderLogo(ctx: Context): string {
  const { bold, reset } = ctx.runtime.palette
  const mark = ctx.runtime.columns < 56 ? ['  PIERRE'] : WORDMARK
  return ['', ...mark.map((line) => `${bold}${line}${reset}`), ''].join('\n')
}

function renderCommands(ctx: Context): string {
  const { bold, dim, reset } = ctx.runtime.palette
  return HELP.map(
    ([verb, text]) => `  ${bold}${pad(verb, COLUMN)}${reset}${dim}${text}${reset}\n`
  ).join('')
}

export function renderStatus(ctx: Context, lines: StatusLine[]): string {
  const { dim, green, red, reset, yellow } = ctx.runtime.palette
  const mark = {
    ok: `${green}■${reset}`,
    warn: `${yellow}□${reset}`,
    bad: `${red}■${reset}`
  }
  const plain = (line: StatusLine) => (line.next ? `${line.value} → ${line.next}` : line.value)
  const room = Math.max(8, ctx.runtime.columns - (2 + COLUMN + 3))
  const width = Math.min(room, Math.max(8, ...lines.map((line) => [...plain(line)].length)))
  const rendered = lines.flatMap((line) => {
    const next = line.next ? ` → ${line.next}` : ''
    const valueRoom = Math.max(1, width - [...next].length)
    const text = truncate(line.value, valueRoom)
    const gap = Math.max(0, width - [...text].length - [...next].length)
    const value = line.next
      ? `${text}${dim} → ${reset}${yellow}${line.next}${reset}${' '.repeat(gap)}`
      : `${text}${' '.repeat(gap)}`
    const row = `  ${dim}${pad(line.label, COLUMN)}${reset}${value}  ${mark[line.level]}\n`
    if (!line.hint) return [row]
    return [
      row,
      `  ${pad('', COLUMN)}${dim}${truncate(line.hint, Math.max(8, ctx.runtime.columns - COLUMN - 2))}${reset}\n`
    ]
  })
  return [renderLogo(ctx), '\n\n', ...rendered, '\n', renderCommands(ctx), '\n'].join('')
}
