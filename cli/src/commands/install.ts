import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import {
  dotenvTemplate,
  formatEnv,
  installationComplete,
  parseDotenv,
  readEnvMap,
  writePrivate,
  type ParsedEnv
} from '../lib/config.ts'
import { fetchReleases, fetchTo, selectCarlRelease, selectServerRelease } from '../lib/github.ts'
import {
  actionScreen,
  providerName,
  renderChoiceLine,
  renderDetailLine,
  renderHintLine
} from '../lib/output.ts'
import { prepareServerFiles, stageServerBundle } from '../lib/server-bundle.ts'
import {
  CommandFailed,
  must,
  providerHttpCode,
  runCommand,
  waitForBody,
  type Context
} from '../lib/system.ts'
import { choose, clearUi, enterUi, leaveUi, pauseDashboard, sayError } from '../lib/tui.ts'

const PACKAGES = [
  'imagemagick',
  'ghostscript',
  'libvirglrenderer1',
  'nftables',
  'iproute2',
  'unzip',
  'jq',
  'less',
  'debian-keyring',
  'debian-archive-keyring',
  'apt-transport-https',
  'gnupg',
  'ca-certificates',
  'curl',
  'openssl'
]

const aptEnv = { DEBIAN_FRONTEND: 'noninteractive' }

export function rememberAssetSource(ctx: Context) {
  const directory = ctx.runtime.env['PIERRE_ASSET_DIR']
  if (!directory) return
  writePrivate(ctx.runtime.paths.assetSourceFile, `${directory}\n`)
}

export function prepareInstallDraft(ctx: Context) {
  const { envFile, pendingEnvFile } = ctx.runtime.paths
  const complete = installationComplete(ctx.runtime)
  if (!existsSync(pendingEnvFile) && existsSync(envFile)) {
    copyFileSync(envFile, pendingEnvFile)
    chmodSync(pendingEnvFile, 0o600)
  }
  if (!complete && existsSync(envFile)) rmSync(envFile, { force: true })
}

async function runInstallStep(ctx: Context, label: string, action: () => Promise<void>) {
  const logFile = ctx.runtime.paths.installLog
  mkdirSync(dirname(logFile), { recursive: true })
  appendFileSync(logFile, `\n=== ${label} ===\n`)
  chmodSync(logFile, 0o600)
  const { cyan, green, red, reset } = ctx.runtime.palette
  let timer: ReturnType<typeof setInterval> | undefined
  if (ctx.runtime.tty) {
    const frames = ['◐', '◓', '◑', '◒']
    let frame = 0
    timer = setInterval(() => {
      const glyph = frames[frame % frames.length] ?? '◐'
      frame += 1
      ctx.runtime.writeOut(`\r\u001b[2K  ${cyan}${glyph}${reset}  ${label}`)
    }, 120)
  }
  try {
    await action()
    if (timer) clearInterval(timer)
    ctx.runtime.writeOut(`${ctx.runtime.tty ? '\r\u001b[2K' : ''}  ${green}✓${reset}  ${label}\n`)
  } catch (error) {
    if (timer) clearInterval(timer)
    const output =
      error instanceof CommandFailed ? error.output : error instanceof Error ? error.message : ''
    if (output) appendFileSync(logFile, output.endsWith('\n') ? output : `${output}\n`)
    ctx.runtime.writeOut(`${ctx.runtime.tty ? '\r\u001b[2K' : ''}  ${red}×${reset}  ${label}\n`)
    throw error
  }
}

async function verifyInstallMachine(ctx: Context) {
  if (ctx.runtime.uid() !== 0 || ctx.runtime.arch() !== 'x86_64' || !ctx.runtime.kvm()) {
    throw new CommandFailed(1, 'Machine incompatible.')
  }
}

async function installPackages(ctx: Context) {
  await must(ctx.runtime, 'apt-get', ['update', '-qq'], { env: aptEnv })
  await must(ctx.runtime, 'apt-get', ['install', '-y', ...PACKAGES], { env: aptEnv })
}

async function installSmolvm(ctx: Context) {
  if (existsSync(ctx.runtime.paths.smolvmBin)) return
  await must(ctx.runtime, 'bash', [
    '-c',
    'curl -fsSL https://smolmachines.com/install.sh | bash -s -- --version 1.0.4'
  ])
  await must(ctx.runtime, 'ln', ['-sfn', '/root/.smolvm/smolvm', ctx.runtime.paths.smolvmBin])
}

async function installCaddy(ctx: Context) {
  if (!existsSync('/usr/share/keyrings/caddy-stable-archive-keyring.gpg')) {
    await must(ctx.runtime, 'bash', [
      '-c',
      "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg"
    ])
    await must(ctx.runtime, 'bash', [
      '-c',
      "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null"
    ])
    await must(ctx.runtime, 'apt-get', ['update', '-qq'], { env: aptEnv })
  }
  await must(ctx.runtime, 'apt-get', ['install', '-y', 'caddy'], { env: aptEnv })
}

async function installServerBinaries(ctx: Context, tag: string) {
  const stage = mkdtempSync(join(tmpdir(), 'pierre-server-install-'))
  const { bin, so } = ctx.runtime.paths
  try {
    await stageServerBundle(ctx, tag, stage)
    prepareServerFiles(ctx, stage)
    renameSync(`${so}.new`, so)
    renameSync(`${bin}.new`, bin)
    await must(ctx.runtime, 'ldconfig', [])
  } finally {
    rmSync(`${bin}.new`, { force: true })
    rmSync(`${so}.new`, { force: true })
    rmSync(stage, { recursive: true, force: true })
  }
}

async function installImage(ctx: Context) {
  const dest = join(ctx.runtime.paths.home, 'smolvm', 'pierre-amd64.smolmachine')
  const stamp = `${dest}.sha256`
  mkdirSync(dirname(dest), { recursive: true })
  let digest = ''
  try {
    const response = await ctx.runtime.request(
      'https://api.github.com/repos/charnould/pierre/releases/tags/microvm',
      {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'pierre-cli' },
        timeoutMs: 10_000
      }
    )
    const parsed = JSON.parse(response.body) as {
      assets?: Array<{ name?: string; digest?: string }>
    }
    digest = parsed.assets?.find((asset) => asset.name === 'pierre-amd64.smolmachine')?.digest ?? ''
  } catch {
    digest = ''
  }
  if (!digest) throw new CommandFailed(1, "L'image smolVM est introuvable.")
  if (existsSync(dest) && existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === digest) return
  await fetchTo(ctx, 'pierre-amd64.smolmachine', dest, 'microvm')
  writeFileSync(stamp, `${digest}\n`)
}

export async function installModel(ctx: Context, tag: string) {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  const stamp = join(dir, 'version')
  mkdirSync(dir, { recursive: true })
  if (
    existsSync(join(dir, 'model.onnx')) &&
    existsSync(stamp) &&
    readFileSync(stamp, 'utf8').trim() === tag
  ) {
    return
  }
  const temp = mkdtempSync(join(tmpdir(), 'pierre-carl-'))
  try {
    await fetchTo(ctx, 'model.zip', join(temp, 'model.zip'), tag)
    await must(ctx.runtime, 'unzip', ['-oq', join(temp, 'model.zip'), '-d', temp])
    rmSync(join(temp, 'model.zip'), { force: true })
    if (!existsSync(join(temp, 'model.onnx'))) {
      throw new CommandFailed(1, "L'archive ne contient pas model.onnx.")
    }
    for (const entry of readdirSync(temp)) {
      cpSync(join(temp, entry), join(dir, entry), { recursive: true })
    }
    writeFileSync(stamp, `${tag}\n`)
    chmodSync(stamp, 0o644)
    rmSync(join(dir, 'model.sha256'), { force: true })
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

async function installLatestModel(ctx: Context) {
  const releases = await fetchReleases(ctx)
  const tag = selectCarlRelease(releases)?.tag
  if (!tag) throw new CommandFailed(1, "Aucune version de carl n'est disponible.")
  await installModel(ctx, tag)
}

async function writeUnits(ctx: Context) {
  const { home, envFile, bin, unitFile, carlUnit } = ctx.runtime.paths
  writeFileSync(
    unitFile,
    `[Unit]
Description=PIERRE
After=network-online.target
Wants=network-online.target

[Service]
Environment=NODE_ENV=production
Environment=PIERRE_HOME=${home}
EnvironmentFile=${envFile}
ExecStart=${bin}
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
`
  )
  if (existsSync(carlUnit)) {
    await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'carl'])
    rmSync(carlUnit, { force: true })
  }
  await must(ctx.runtime, 'systemctl', ['daemon-reload'])
  await must(ctx.runtime, 'systemctl', ['enable', 'pierre'])
  await must(ctx.runtime, 'systemctl', ['restart', 'pierre'])
}

export async function writeCaddy(ctx: Context, host: string) {
  const file = ctx.runtime.paths.caddyFile
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(
    file,
    `${host} {
	reverse_proxy 127.0.0.1:3000 {
		flush_interval -1
		transport http {
			read_timeout 30m
			write_timeout 30m
			response_header_timeout 30m
		}
	}
}
`
  )
  await must(ctx.runtime, 'systemctl', ['enable', 'caddy'])
  const active = await runCommand(ctx.runtime, 'systemctl', ['is-active', '--quiet', 'caddy'])
  await must(ctx.runtime, 'systemctl', [active.code === 0 ? 'reload' : 'start', 'caddy'])
}

export async function activateInstallation(ctx: Context, env: ParsedEnv) {
  const { envFile, pendingEnvFile, previousEnvFile, caddyFile, previousCaddyFile } =
    ctx.runtime.paths
  rmSync(previousEnvFile, { force: true })
  rmSync(previousCaddyFile, { force: true })
  if (existsSync(envFile)) {
    copyFileSync(envFile, previousEnvFile)
    chmodSync(previousEnvFile, 0o600)
  }
  if (existsSync(caddyFile)) copyFileSync(caddyFile, previousCaddyFile)
  copyFileSync(pendingEnvFile, envFile)
  chmodSync(envFile, 0o600)
  await writeUnits(ctx)
  await writeCaddy(ctx, env.host)
}

export async function rollbackInstallation(ctx: Context) {
  const { envFile, previousEnvFile, caddyFile, previousCaddyFile } = ctx.runtime.paths
  if (existsSync(previousEnvFile)) {
    renameSync(previousEnvFile, envFile)
    await runCommand(ctx.runtime, 'systemctl', ['restart', 'pierre'])
  } else {
    rmSync(envFile, { force: true })
    await runCommand(ctx.runtime, 'systemctl', ['stop', 'pierre'])
  }
  if (existsSync(previousCaddyFile)) renameSync(previousCaddyFile, caddyFile)
  else rmSync(caddyFile, { force: true })
  await runCommand(ctx.runtime, 'systemctl', ['reload', 'caddy'])
}

export function finalizeInstallation(ctx: Context) {
  const { pendingEnvFile, previousEnvFile, previousCaddyFile, assetSourceFile } = ctx.runtime.paths
  rmSync(pendingEnvFile, { force: true })
  rmSync(previousEnvFile, { force: true })
  rmSync(previousCaddyFile, { force: true })
  rmSync(assetSourceFile, { force: true })
}

export function finalizeConfiguration(ctx: Context) {
  const { pendingEnvFile, previousEnvFile, previousCaddyFile } = ctx.runtime.paths
  rmSync(pendingEnvFile, { force: true })
  rmSync(previousEnvFile, { force: true })
  rmSync(previousCaddyFile, { force: true })
}

function screen(ctx: Context, title: string) {
  if (ctx.runtime.tty || ctx.runtime.uiActive) {
    clearUi(ctx.runtime)
    ctx.runtime.writeOut(actionScreen(ctx, title))
    return
  }
  ctx.runtime.writeOut(`${title}\n\n`)
}

async function installFailed(ctx: Context, step: string) {
  const asset = ctx.runtime.env['PIERRE_ASSET_DIR']
  const retry = asset ? `PIERRE_ASSET_DIR=${asset} pierre install` : 'pierre install'
  const { cyan, dim, reset } = ctx.runtime.palette
  screen(ctx, 'Installation interrompue')
  ctx.runtime.writeOut(`  L’étape « ${step} » n’a pas abouti.\n\n`)
  ctx.runtime.writeOut('  Les réponses sont conservées pour le prochain essai.\n')
  ctx.runtime.writeOut(`  Relancez simplement : ${cyan}${retry}${reset}\n\n`)
  ctx.runtime.writeOut(`  ${dim}Dernières informations techniques :${reset}\n`)
  const log = existsSync(ctx.runtime.paths.installLog)
    ? readFileSync(ctx.runtime.paths.installLog, 'utf8')
    : ''
  const marker = `=== ${step} ===`
  const lines = log.split('\n')
  const index = lines.findIndex((line) => line === marker)
  const tail = (index === -1 ? [] : lines.slice(index + 1)).slice(-8)
  for (const line of tail) ctx.runtime.writeOut(`  ${line}\n`)
  ctx.runtime.writeOut(`\n  Journal complet : ${ctx.runtime.paths.installLog}\n`)
  await pauseDashboard(ctx)
}

async function installSuccess(ctx: Context, env: ParsedEnv) {
  const { cyan, yellow, bold, reset } = ctx.runtime.palette
  screen(ctx, 'PIERRE est opérationnel')
  ctx.runtime.writeOut(`  Adresse : ${cyan}https://${env.host}${reset}\n`)
  ctx.runtime.writeOut('  Compte : admin@pierre-ia.org\n\n')
  if (env.cmMode === 'now') {
    ctx.runtime.writeOut(`  ${bold}Terminez maintenant la configuration dans CM.com :${reset}\n\n`)
    ctx.runtime.writeOut(`  Endpoint : https://${env.host}/webhook/rcs\n`)
    ctx.runtime.writeOut('  Méthode : POST\n')
    ctx.runtime.writeOut('  Encodage : JSON\n')
    ctx.runtime.writeOut('  Header : Webhook-Secret\n')
    ctx.runtime.writeOut(`  Valeur : ${env.cmWebhookSecret}\n\n`)
    ctx.runtime.writeOut(
      `  ${yellow}Copiez cette valeur dans CM.com avant de quitter cet écran.${reset}\n`
    )
  } else {
    ctx.runtime.writeOut(`  ${yellow}CM.com n’est pas encore configuré.${reset}\n`)
    ctx.runtime.writeOut('  RCS et SMS resteront indisponibles jusqu’à sa configuration.\n')
    ctx.runtime.writeOut('  Guide : docs/06-installation/01-server/03-channels.md\n')
  }
  await pauseDashboard(ctx)
}

export async function runInstallation(ctx: Context, env: ParsedEnv): Promise<number> {
  const logFile = ctx.runtime.paths.installLog
  mkdirSync(dirname(logFile), { recursive: true })
  writeFileSync(logFile, '', { mode: 0o600 })
  screen(ctx, 'Installation en cours')
  ctx.runtime.writeOut('  Cette opération peut prendre plusieurs minutes.\n')
  ctx.runtime.writeOut('  Vous pouvez laisser ce terminal ouvert.\n\n')

  const steps: Array<[string, () => Promise<void>]> = [
    ['Prérequis du serveur', () => verifyInstallMachine(ctx)],
    ['Paquets système', () => installPackages(ctx)],
    ['Moteur de micro-VM', () => installSmolvm(ctx)],
    ['Serveur web Caddy', () => installCaddy(ctx)],
    ['Serveur PIERRE', async () => installServerBinaries(ctx, await serverTag(ctx))],
    ['Image des micro-VM', () => installImage(ctx)],
    ['Modèle carl', () => installLatestModel(ctx)]
  ]
  for (const [label, action] of steps) {
    try {
      await runInstallStep(ctx, label, action)
    } catch {
      await installFailed(ctx, label)
      return 1
    }
  }
  try {
    await runInstallStep(ctx, 'Services PIERRE', () => activateInstallation(ctx, env))
  } catch {
    await rollbackInstallation(ctx)
    await installFailed(ctx, 'Services PIERRE')
    return 1
  }
  try {
    await runInstallStep(ctx, 'Accès HTTPS', () => waitForPublic(ctx, env.host))
  } catch {
    await rollbackInstallation(ctx)
    await installFailed(ctx, 'Accès HTTPS')
    return 1
  }
  finalizeInstallation(ctx)
  await installSuccess(ctx, env)
  return 0
}

async function serverTag(ctx: Context): Promise<string> {
  const forced = ctx.runtime.env['PIERRE_RELEASE']
  if (forced && forced !== 'latest') return forced
  const selected = selectServerRelease(await fetchReleases(ctx))
  if (!selected) throw new CommandFailed(1, 'Aucune version stable du serveur n’est disponible.')
  return selected.tag
}

async function waitForPublic(ctx: Context, host: string) {
  const ready = await waitForBody(ctx.runtime, `https://${host}/up`, 120)
  if (!ready) throw new CommandFailed(1, `https://${host}/up ne répond pas.`)
}

const interactiveInput = (ctx: Context) =>
  ctx.runtime.canPrompt && ctx.runtime.stdinTTY && ctx.runtime.env['PIERRE_ENV_STDIN'] !== '1'

async function captureBlock(ctx: Context, mode: 'install' | 'configure'): Promise<string | null> {
  if (!interactiveInput(ctx)) return ctx.runtime.readStdin()
  const { bold, dim, reset } = ctx.runtime.palette
  screen(ctx, mode === 'install' ? 'Installer PIERRE' : 'Configurer PIERRE')
  ctx.runtime.writeOut('  Collez les 10 variables au format dotenv.\n')
  ctx.runtime.writeOut(`  Terminez par une ligne contenant uniquement ${bold}END${reset}.\n`)
  ctx.runtime.writeOut('  Le collage reste masqué et n’est jamais journalisé.\n\n')
  ctx.runtime.writeOut(`  ${dim}Modèle attendu :${reset}\n`)
  for (const line of dotenvTemplate(mode).split('\n')) ctx.runtime.writeOut(`  ${line}\n`)
  ctx.runtime.writeOut(`\n  ${dim}En attente du bloc…${reset}\n`)
  ctx.runtime.writeOut('\u001b[?25h')
  await runCommand(ctx.runtime, 'stty', ['-echo'])
  const lines: string[] = []
  let ended = false
  try {
    while (true) {
      const line = await ctx.runtime.readLine()
      if (line === null) break
      if (line === 'END') {
        ended = true
        break
      }
      lines.push(line)
    }
  } finally {
    await runCommand(ctx.runtime, 'stty', ['echo'])
    ctx.runtime.writeOut('\u001b[?25l')
  }
  if (!ended) {
    sayError(ctx, 'Le bloc doit se terminer par END.')
    return null
  }
  return `${lines.join('\n')}\n`
}

async function confirmBlock(ctx: Context, mode: 'install' | 'configure', env: ParsedEnv) {
  const options =
    mode === 'install'
      ? ['Installer PIERRE', 'Revenir au bloc', 'Annuler']
      : ['Appliquer la configuration', 'Revenir au bloc', 'Annuler']
  const title = mode === 'install' ? 'Vérifier avant d’installer' : 'Vérifier les modifications'
  const selected = await choose(ctx, options.length, (index) => {
    screen(ctx, title)
    ctx.runtime.writeOut(renderDetailLine(ctx, 'Domaine', env.host, 12))
    ctx.runtime.writeOut(
      renderDetailLine(ctx, 'llm', `${providerName(env.aiType)} · connexion validée`, 12)
    )
    ctx.runtime.writeOut(
      renderDetailLine(ctx, 'CM.com', env.cmMode === 'now' ? 'configuré' : 'désactivé', 12)
    )
    ctx.runtime.writeOut(
      `\n  ${ctx.runtime.palette.dim}Aucun secret n’est affiché.${ctx.runtime.palette.reset}\n\n`
    )
    options.forEach((option, optionIndex) => {
      ctx.runtime.writeOut(renderChoiceLine(ctx, option, optionIndex === index))
    })
    ctx.runtime.writeOut('\n')
    ctx.runtime.writeOut(renderHintLine(ctx, '↑↓ naviguer · ↵ choisir · ← retour'))
  })
  if (selected === 0) return 'apply' as const
  if (selected === 1) return 'back' as const
  return 'cancel' as const
}

export async function collectDotenv(
  ctx: Context,
  mode: 'install' | 'configure'
): Promise<{ action: 'apply' | 'cancel'; env: ParsedEnv | null }> {
  const interactive = interactiveInput(ctx)
  while (true) {
    const text = await captureBlock(ctx, mode)
    if (text === null) return { action: 'cancel', env: null }
    const parsed = parseDotenv(
      text,
      mode,
      readEnvMap(ctx.runtime.paths.envFile),
      ctx.runtime.randomHex
    )
    if (!parsed.ok) {
      if (interactive) {
        screen(ctx, 'Bloc invalide')
        ctx.runtime.writeOut(`  ${parsed.error}\n`)
        await pauseDashboard(ctx)
        continue
      }
      sayError(ctx, parsed.error)
      return { action: 'cancel', env: null }
    }
    const code = await providerHttpCode(
      ctx.runtime,
      parsed.env.aiType,
      parsed.env.aiBaseUrl,
      parsed.env.aiApiKey
    )
    if (code !== 200) {
      if (interactive) {
        screen(ctx, 'Connexion llm refusée')
        ctx.runtime.writeOut(
          '  Le fournisseur a refusé la connexion.\n  Vérifiez AI_TYPE, AI_BASE_URL et AI_API_KEY.\n'
        )
        await pauseDashboard(ctx)
        continue
      }
      sayError(ctx, 'Le fournisseur llm a refusé la connexion.')
      return { action: 'cancel', env: null }
    }
    if (!interactive) return { action: 'apply', env: parsed.env }
    const choice = await confirmBlock(ctx, mode, parsed.env)
    if (choice === 'back') continue
    if (choice === 'cancel') return { action: 'cancel', env: null }
    return { action: 'apply', env: parsed.env }
  }
}

async function installWizard(ctx: Context): Promise<number> {
  prepareInstallDraft(ctx)
  const interactive = interactiveInput(ctx)
  if (interactive) enterUi(ctx.runtime)
  try {
    const collected = await collectDotenv(ctx, 'install')
    if (collected.action !== 'apply' || !collected.env) return 1
    writePrivate(ctx.runtime.paths.pendingEnvFile, formatEnv(collected.env))
    return await runInstallation(ctx, collected.env)
  } finally {
    if (interactive) leaveUi(ctx.runtime)
  }
}

export async function installCommand(ctx: Context): Promise<number> {
  rememberAssetSource(ctx)
  return installWizard(ctx)
}
