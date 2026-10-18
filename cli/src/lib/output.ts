import type { Context } from './system.ts'

export const PROJECT_URL = 'https://pierre-ia.org'
export const CODE_URL = 'https://github.com/charnould/pierre'
export const DOCS_URL =
  'https://github.com/charnould/pierre/blob/master/docs/06-installation/01-server/01-deploy.md'

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

export function renderHelp(ctx: Context): string {
  const { cyan, dim, reset } = ctx.runtime.palette
  return `${renderBrand(ctx)}\n${HELP.map(
    ([verb, text]) => `  ${cyan}${verb.padEnd(12)}${reset}  ${dim}${text}${reset}\n`
  ).join('')}`
}

export function renderStatus(ctx: Context, lines: StatusLine[]): string {
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
    ['Code', CODE_URL],
    ['Documentation', DOCS_URL]
  ].map(([label, url]) => `  ${dim}${pad(label ?? '', labelWidth)}${reset}${cyan}${url}${reset}\n`)
  return [renderBrand(ctx), '\n', ...rendered, '\n', ...links].join('')
}

export function providerLabel(type: string): string {
  return type === 'openai' ? 'OpenAI' : type === 'anthropic' ? 'Anthropic' : type
}
