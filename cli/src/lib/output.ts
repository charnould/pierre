import type { ParsedEnv } from './config.ts'
import { versionGreater } from './github.ts'
import type { Context } from './system.ts'

export type Dashboard = {
  networkOk: boolean
  networkStatus: string
  networkDetail: string
  pierreOk: boolean
  pierreStatus: string
  serverVersion: string
  serverLatest: string
  cliOk: boolean
  cliStatus: string
  cliVersion: string
  cliLatest: string
  carlOk: boolean
  carlStatus: string
  carlVersion: string
  carlLatest: string
  providerOk: boolean
  providerStatus: string
  providerDetail: string
}

const HELP: Array<[string, string]> = [
  ['install', 'Installe PIERRE sur cette machine'],
  ['update', 'Met à jour PIERRE (serveur)'],
  ['update-cli', 'Met à jour le cli'],
  ['carl', 'Met à jour carl (classification)'],
  ['restart', 'Redémarre PIERRE (serveur)'],
  ['backup', 'Sauvegarde les données'],
  ['logs', 'Consulte les journaux en direct'],
  ['configure', 'Modifie domaine, llm et CM.com'],
  ['env', 'Affiche toutes les variables d’environnement'],
  ['remove', 'Désinstalle tout'],
  ['help', 'Affiche cette liste']
]

const WORDMARK = [
  '  ██████╗ ██╗███████╗██████╗ ██████╗ ███████╗',
  '  ██╔══██╗██║██╔════╝██╔══██╗██╔══██╗██╔════╝',
  '  ██████╔╝██║█████╗  ██████╔╝██████╔╝█████╗',
  '  ██╔═══╝ ██║██╔══╝  ██╔══██╗██╔══██╗██╔══╝',
  '  ██║     ██║███████╗██║  ██║██║  ██║███████╗',
  '  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝'
]

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
  const { cyan, dim, reset } = ctx.runtime.palette
  const mark = ctx.runtime.columns < 56 ? ['', '  ◆  PIERRE'] : ['', ...WORDMARK]
  return [
    ...mark.map((line) => (line ? `${cyan}${line}${reset}` : line)),
    '',
    `  ${dim}Application agentique et open source${reset}`,
    `  ${dim}au service du mouvement HLM${reset}`,
    '',
    ''
  ].join('\n')
}

export function renderBrand(ctx: Context): string {
  const { cyan, dim, reset } = ctx.runtime.palette
  return `\n  ${cyan}◆  PIERRE${reset}  ${dim}${ctx.version}${reset}\n`
}

function versionNote(installed: string, latest: string): string {
  if (installed === 'absent') return 'non installé'
  if (!latest) return 'version publiée indisponible'
  if (installed === latest) return 'à jour'
  if (versionGreater(latest, installed)) return `${latest} disponible`
  return 'version locale'
}

function compactVersionNote(
  ok: boolean,
  status: string,
  installed: string,
  latest: string
): string {
  const note = versionNote(installed, latest)
  const update = versionGreater(latest, installed) ? `↑ ${latest}` : note
  return ok ? update : `${status}${update.startsWith('↑') ? ` · ${update}` : ''}`
}

export function serverUpdateAvailable(dash: Dashboard): boolean {
  return (
    dash.serverLatest !== '' &&
    dash.serverVersion !== 'absent' &&
    versionGreater(dash.serverLatest, dash.serverVersion)
  )
}

export function cliUpdateAvailable(dash: Dashboard): boolean {
  return dash.cliLatest !== '' && versionGreater(dash.cliLatest, dash.cliVersion)
}

function renderStatusLine(
  ctx: Context,
  ok: boolean,
  label: string,
  value: string,
  detail: string
): string {
  const { dim, green, red, reset } = ctx.runtime.palette
  const color = ok ? green : red
  return `  ${color}●${reset}  ${dim}${pad(label, 15)}${reset} ${pad(value, 18)} ${detail}\n`
}

function renderVersionStatusLine(
  ctx: Context,
  ok: boolean,
  label: string,
  installed: string,
  latest: string,
  status: string,
  emphasizeUpdate = false
): string {
  const { reset, yellow } = ctx.runtime.palette
  const note = `(${versionNote(installed, latest)})`
  const styledNote =
    emphasizeUpdate && versionGreater(latest, installed) ? `${yellow}${note}${reset}` : note
  return renderStatusLine(ctx, ok, label, installed, `${status} ${styledNote}`)
}

function renderCompactStatusLine(
  ctx: Context,
  ok: boolean,
  label: string,
  value: string,
  detail: string
): string {
  const { dim, green, red, reset } = ctx.runtime.palette
  const color = ok ? green : red
  const labelWidth = 9
  const prefixWidth = 5 + labelWidth
  if (ctx.runtime.columns >= 56) {
    const valueWidth = 20
    const detailWidth = Math.max(1, ctx.runtime.columns - prefixWidth - valueWidth - 3)
    const visibleValue = pad(truncate(value, valueWidth), valueWidth)
    const visibleDetail = truncate(detail, detailWidth)
    return `  ${color}●${reset}  ${dim}${pad(label, labelWidth)}${reset}${visibleValue}${dim} · ${reset}${visibleDetail}\n`
  }
  const text = truncate(`${value} · ${detail}`, Math.max(1, ctx.runtime.columns - prefixWidth))
  return `  ${color}●${reset}  ${dim}${pad(label, labelWidth)}${reset}${text}\n`
}

function renderCompactDashboard(ctx: Context, dash: Dashboard): string {
  return [
    renderLogo(ctx),
    renderCompactStatusLine(ctx, dash.networkOk, 'réseau', dash.networkDetail, dash.networkStatus),
    renderCompactStatusLine(
      ctx,
      dash.pierreOk,
      'serveur',
      dash.serverVersion,
      compactVersionNote(dash.pierreOk, dash.pierreStatus, dash.serverVersion, dash.serverLatest)
    ),
    renderCompactStatusLine(
      ctx,
      dash.cliOk,
      'cli',
      dash.cliVersion,
      compactVersionNote(dash.cliOk, dash.cliStatus, dash.cliVersion, dash.cliLatest)
    ),
    renderCompactStatusLine(
      ctx,
      dash.carlOk,
      'carl',
      dash.carlVersion,
      compactVersionNote(dash.carlOk, dash.carlStatus, dash.carlVersion, dash.carlLatest)
    ),
    renderCompactStatusLine(ctx, dash.providerOk, 'llm', dash.providerDetail, dash.providerStatus)
  ].join('')
}

export function renderDashboard(
  ctx: Context,
  dash: Dashboard,
  mode: 'full' | 'compact' = 'full'
): string {
  if (mode === 'compact') return renderCompactDashboard(ctx, dash)
  const { cyan, dim, yellow, reset } = ctx.runtime.palette
  const lines = [
    renderLogo(ctx),
    renderStatusLine(ctx, dash.networkOk, 'réseau', dash.networkStatus, dash.networkDetail),
    renderVersionStatusLine(
      ctx,
      dash.pierreOk,
      'serveur',
      dash.serverVersion,
      dash.serverLatest,
      dash.pierreStatus
    ),
    renderVersionStatusLine(
      ctx,
      dash.cliOk,
      'cli',
      dash.cliVersion,
      dash.cliLatest,
      dash.cliStatus,
      true
    ),
    renderVersionStatusLine(
      ctx,
      dash.carlOk,
      'carl',
      dash.carlVersion,
      dash.carlLatest,
      dash.carlStatus
    ),
    renderStatusLine(ctx, dash.providerOk, 'llm', dash.providerDetail, dash.providerStatus)
  ]
  if (serverUpdateAvailable(dash)) {
    lines.push(
      '\n',
      `  ${yellow}↑  Mise à jour disponible · ${dash.serverVersion} → ${dash.serverLatest}${reset}\n`,
      `  ${dim}Le serveur et la bibliothèque ONNX seront mis à jour. Le cli reste inchangé.${reset}\n`
    )
  }
  lines.push(
    '\n',
    `  ${cyan}https://github.com/charnould/pierre${reset}\n`,
    `  ${cyan}https://pierre-ia.org${reset}\n`
  )
  return lines.join('')
}

export function renderHelp(ctx: Context): string {
  const { cyan, dim, reset } = ctx.runtime.palette
  return HELP.map(
    ([verb, text]) => `${cyan}${verb.padEnd(12)}${reset}  ${dim}${text}${reset}\n`
  ).join('')
}

export function renderDetailLine(ctx: Context, label: string, value: string, width = 20): string {
  const { dim, reset } = ctx.runtime.palette
  const visible = truncate(value, Math.max(1, ctx.runtime.columns - width - 2))
  return `  ${dim}${pad(`${label} :`, width)}${reset}${visible}\n`
}

export function renderChoiceLine(ctx: Context, label: string, selected: boolean): string {
  const { cyan, reset } = ctx.runtime.palette
  const visible = truncate(label, Math.max(1, ctx.runtime.columns - 5))
  return selected ? `  ${cyan}❯  ${visible}${reset}\n` : `     ${visible}\n`
}

export function renderHintLine(ctx: Context, text: string): string {
  const { dim, reset } = ctx.runtime.palette
  return `  ${dim}${truncate(text, Math.max(1, ctx.runtime.columns - 2))}${reset}\n`
}

export function renderMenu(
  ctx: Context,
  dash: Dashboard,
  selected: number,
  labels: string[]
): string {
  const { bold, reset } = ctx.runtime.palette
  const lines = [
    renderDashboard(ctx, dash, 'compact'),
    `\n  ${bold}Que voulez-vous faire ?${reset}\n\n`
  ]
  labels.forEach((label, index) => {
    if (label === 'Tout désinstaller') lines.push('\n')
    lines.push(renderChoiceLine(ctx, label, index === selected))
  })
  const hint =
    ctx.runtime.columns < 48
      ? '↑↓ · ↵ choisir · q quitter'
      : '↑↓ naviguer · ↵ choisir · esc/q quitter'
  lines.push('\n', renderHintLine(ctx, hint))
  return lines.join('')
}

export function actionScreen(ctx: Context, title: string): string {
  const { bold, reset } = ctx.runtime.palette
  return `${renderBrand(ctx)}\n  ${bold}${title}${reset}\n\n`
}

export function providerName(type: ParsedEnv['aiType'] | string): string {
  return type === 'openai' ? 'OpenAI' : 'Anthropic'
}
