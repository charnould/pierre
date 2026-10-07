import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { readEnvValue } from '../lib/config.ts'
import {
  fetchReleases,
  selectCarlRelease,
  selectCliRelease,
  selectServerRelease
} from '../lib/github.ts'
import {
  actionScreen,
  cliUpdateAvailable,
  renderBrand,
  renderChoiceLine,
  renderDashboard,
  renderDetailLine,
  renderHintLine,
  renderMenu,
  serverUpdateAvailable,
  type Dashboard
} from '../lib/output.ts'
import { providerHttpCode, runCommand, type Context } from '../lib/system.ts'
import {
  MAIN_MENU,
  choose,
  clearUi,
  enterUi,
  leaveUi,
  menuAction,
  moveSelection,
  pauseDashboard
} from '../lib/tui.ts'
import { backup } from './backup.ts'
import { carlMenu } from './carl.ts'
import { configure } from './configure.ts'
import { logs } from './logs.ts'
import { remove } from './remove.ts'
import { restart } from './restart.ts'
import { installCliRelease, updateCli } from './update-cli.ts'
import { installServerRelease, updateServer } from './update-server.ts'

const okBody = async (ctx: Context, url: string, timeoutMs: number) => {
  const response = await ctx.runtime.request(url, { timeoutMs })
  if (response.status < 200 || response.status >= 300) return ''
  return response.body.trim()
}

async function installedServer(ctx: Context): Promise<string> {
  if (!existsSync(ctx.runtime.paths.bin)) return 'absent'
  const result = await runCommand(ctx.runtime, ctx.runtime.paths.bin, ['--version'])
  const version = result.stdout.trim().split(/\s+/)[0] ?? ''
  return version || 'absent'
}

function installedCarl(ctx: Context): string {
  const file = join(ctx.runtime.paths.home, 'models', 'carl', 'version')
  if (!existsSync(file)) return 'absent'
  return readFileSync(file, 'utf8').replace(/\s+/g, '') || 'absent'
}

export async function collectDashboard(ctx: Context): Promise<Dashboard> {
  const host = readEnvValue(ctx.runtime.paths.envFile, 'HOST')
  const pierreActive = (
    await runCommand(ctx.runtime, 'systemctl', ['is-active', 'pierre'])
  ).stdout.trim()
  const caddyActive = (
    await runCommand(ctx.runtime, 'systemctl', ['is-active', 'caddy'])
  ).stdout.trim()
  const local = pierreActive === 'active' ? await okBody(ctx, 'http://127.0.0.1:3000/up', 3000) : ''
  const publicBody = host ? await okBody(ctx, `https://${host}/up`, 5000) : ''
  const pierreOk = pierreActive === 'active' && local === 'ok'
  const networkOk = caddyActive === 'active' && publicBody === 'ok'
  let carlOk = false
  if (pierreOk) {
    const response = await ctx.runtime.request('http://127.0.0.1:3000/api/models/carl', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"texte":"la chaudière est en panne"}',
      timeoutMs: 8000
    })
    carlOk = response.status === 200
  }
  const type = readEnvValue(ctx.runtime.paths.envFile, 'AI_TYPE')
  const base = readEnvValue(ctx.runtime.paths.envFile, 'AI_BASE_URL')
  const key = readEnvValue(ctx.runtime.paths.envFile, 'AI_API_KEY')
  let providerOk = false
  let providerStatus = 'non configuré'
  let providerDetail = 'fournisseur absent'
  const provider = type === 'openai' ? 'OpenAI' : type === 'anthropic' ? 'Anthropic' : ''
  if (!provider) {
    providerStatus = 'non configuré'
    providerDetail = 'fournisseur absent'
  } else if (!base || !key) {
    providerStatus = 'non configuré'
    providerDetail = provider
  } else {
    const code = await providerHttpCode(ctx.runtime, type, base, key)
    providerDetail = provider
    if (code === 200) {
      providerOk = true
      providerStatus = 'connecté'
    } else if (code === 401 || code === 403) {
      providerStatus = 'clé refusée'
    } else {
      providerStatus = 'indisponible'
      providerDetail = `${provider} · HTTP ${code}`
    }
  }
  const releases = await fetchReleases(ctx)
  const cliLatest = selectCliRelease(releases)?.tag ?? ''
  return {
    networkOk,
    networkStatus: networkOk ? 'opérationnel' : 'indisponible',
    networkDetail: host || 'hôte absent',
    pierreOk,
    pierreStatus: pierreOk ? 'opérationnel' : 'indisponible',
    serverVersion: await installedServer(ctx),
    serverLatest: selectServerRelease(releases)?.tag ?? '',
    cliOk: true,
    cliStatus: 'opérationnel',
    cliVersion: ctx.version,
    cliLatest,
    carlOk,
    carlStatus: carlOk ? 'opérationnel' : 'indisponible',
    carlVersion: installedCarl(ctx),
    carlLatest: selectCarlRelease(releases)?.tag ?? '',
    providerOk,
    providerStatus,
    providerDetail
  }
}

export async function showStatus(ctx: Context): Promise<number> {
  const dash = await collectDashboard(ctx)
  const { cyan, reset } = ctx.runtime.palette
  ctx.runtime.writeOut(renderDashboard(ctx, dash))
  ctx.runtime.writeOut(`\n  ${cyan}pierre help${reset} pour les commandes\n`)
  return 0
}

function menuLabels(dash: Dashboard): string[] {
  return MAIN_MENU.map((item) => {
    if (item.action === 'update' && serverUpdateAvailable(dash)) {
      return `Mettre à jour PIERRE vers ${dash.serverLatest}`
    }
    if (item.action === 'update-cli' && cliUpdateAvailable(dash)) {
      return `Mettre à jour le cli vers ${dash.cliLatest}`
    }
    return item.label
  })
}

function screen(ctx: Context, title: string) {
  clearUi(ctx.runtime)
  ctx.runtime.writeOut(actionScreen(ctx, title))
}

async function confirmUpdate(
  ctx: Context,
  dash: Dashboard,
  kind: 'server' | 'cli'
): Promise<boolean> {
  const choice = await choose(ctx, 2, (index) => {
    const options = ['Installer maintenant', 'Plus tard']
    screen(ctx, kind === 'server' ? 'Mettre à jour PIERRE' : 'Mettre à jour le cli')
    if (kind === 'server') {
      ctx.runtime.writeOut(renderDetailLine(ctx, 'Version installée', dash.serverVersion))
      ctx.runtime.writeOut(renderDetailLine(ctx, 'Nouvelle version', dash.serverLatest))
      ctx.runtime.writeOut('\n')
      ctx.runtime.writeOut('  Le serveur et la bibliothèque ONNX seront mis à jour.\n')
      ctx.runtime.writeOut(
        '  Le cli, la base, les fichiers, carl et les micro-VM ne seront pas modifiés.\n\n'
      )
    } else {
      ctx.runtime.writeOut(renderDetailLine(ctx, 'Version installée', dash.cliVersion))
      ctx.runtime.writeOut(renderDetailLine(ctx, 'Nouvelle version', dash.cliLatest))
      ctx.runtime.writeOut('\n')
      ctx.runtime.writeOut('  Seul le programme pierre sera remplacé.\n')
      ctx.runtime.writeOut('  Aucun service ni donnée ne sera modifié.\n\n')
    }
    options.forEach((option, optionIndex) => {
      ctx.runtime.writeOut(renderChoiceLine(ctx, option, optionIndex === index))
    })
    ctx.runtime.writeOut('\n')
    ctx.runtime.writeOut(renderHintLine(ctx, '↑↓ naviguer · ↵ choisir · ← retour'))
  })
  return choice === 0
}

async function runAction(ctx: Context, dash: Dashboard, action: string): Promise<boolean> {
  const { green, red, yellow, reset } = ctx.runtime.palette
  if (action === 'logs') {
    await logs(ctx, true)
    return false
  }
  if (action === 'carl') {
    await carlMenu(ctx)
    return false
  }
  if (action === 'update') {
    if (serverUpdateAvailable(dash) && !(await confirmUpdate(ctx, dash, 'server'))) return false
    screen(ctx, 'Mettre à jour PIERRE')
    ctx.runtime.writeOut('  Recherche de la dernière version du serveur…\n\n')
    const code = serverUpdateAvailable(dash)
      ? await installServerRelease(ctx, dash.serverLatest)
      : await updateServer(ctx)
    if (code !== 0) ctx.runtime.writeOut(`\n  ${red}La mise à jour a échoué.${reset}\n`)
    await pauseDashboard(ctx)
    return false
  }
  if (action === 'update-cli') {
    if (cliUpdateAvailable(dash) && !(await confirmUpdate(ctx, dash, 'cli'))) return false
    screen(ctx, 'Mettre à jour le cli')
    ctx.runtime.writeOut('  Recherche de la dernière version du cli…\n\n')
    const code = cliUpdateAvailable(dash)
      ? await installCliRelease(ctx, dash.cliLatest)
      : await updateCli(ctx)
    if (code !== 0) ctx.runtime.writeOut(`\n  ${red}La mise à jour a échoué.${reset}\n`)
    await pauseDashboard(ctx)
    return false
  }
  if (action === 'restart') {
    screen(ctx, 'Redémarrer PIERRE (serveur)')
    ctx.runtime.writeOut('  PIERRE va être indisponible pendant environ une minute.\n')
    ctx.runtime.writeOut('  Aucune donnée ne sera perdue.\n\n')
    const code = await restart(ctx)
    ctx.runtime.writeOut(
      code === 0
        ? `\n  ${green}PIERRE est de nouveau opérationnel.${reset}\n`
        : `\n  ${red}Le serveur n’a pas redémarré.${reset}\n`
    )
    await pauseDashboard(ctx)
    return false
  }
  if (action === 'backup') {
    screen(ctx, 'Sauvegarder les données')
    ctx.runtime.writeOut('  Création d’une copie cohérente de la base de données…\n\n')
    ctx.runtime.uiActive = true
    const code = await backup(ctx, true)
    if (code !== 0) ctx.runtime.writeOut(`\n  ${red}La sauvegarde a échoué.${reset}\n`)
    await pauseDashboard(ctx)
    return false
  }
  if (action === 'configure') {
    await configure(ctx)
    return false
  }
  if (action === 'remove') {
    screen(ctx, 'Tout désinstaller')
    ctx.runtime.writeOut('  Cette action supprimera définitivement :\n\n')
    ctx.runtime.writeOut('  • le serveur PIERRE et sa configuration ;\n')
    ctx.runtime.writeOut('  • la base de données et les fichiers ;\n')
    ctx.runtime.writeOut('  • carl et les micro-VM.\n\n')
    ctx.runtime.writeOut(`  ${yellow}Sauvegardez les données avant de continuer.${reset}\n\n`)
    ctx.runtime.writeOut('\u001b[?25h')
    await remove(ctx)
    ctx.runtime.writeOut('\u001b[?25l')
    if (!existsSync(ctx.runtime.paths.cmd)) {
      leaveUi(ctx.runtime)
      return true
    }
    await pauseDashboard(ctx)
  }
  return false
}

export async function interactiveDashboard(ctx: Context): Promise<number> {
  enterUi(ctx.runtime)
  try {
    clearUi(ctx.runtime)
    ctx.runtime.writeOut(renderLogoLoading(ctx))
    let dash = await collectDashboard(ctx)
    let selected = 0
    while (true) {
      clearUi(ctx.runtime)
      ctx.runtime.writeOut(renderMenu(ctx, dash, selected, menuLabels(dash)))
      const key = await ctx.runtime.readKey()
      if (key === null || key === 'back' || key === 'quit') break
      if (key === 'up' || key === 'down') selected = moveSelection(selected, MAIN_MENU.length, key)
      if (key === 'enter') {
        const action = menuAction(selected)
        if (action === 'quit') break
        if (await runAction(ctx, dash, action)) return 0
        clearUi(ctx.runtime)
        ctx.runtime.writeOut(renderLogoLoading(ctx))
        dash = await collectDashboard(ctx)
      }
    }
    return 0
  } finally {
    leaveUi(ctx.runtime)
  }
}

function renderLogoLoading(ctx: Context): string {
  const { dim, reset } = ctx.runtime.palette
  return `${renderBrand(ctx)}\n  ${dim}Vérification du système…${reset}\n`
}
