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

import { CARL_MODEL_FILES } from '../../../shared/carl-model.ts'
import {
  formatEnv,
  INSTALL_USAGE,
  isConfigured,
  isInstalled,
  mergeConfiguration,
  parseHostArgs,
  readEnvMap,
  writePrivate,
  type ConfigureFlags,
  type ParsedEnv
} from '../lib/config.ts'
import { fetchReleases, fetchTo, selectCarlRelease, selectServerRelease } from '../lib/github.ts'
import {
  activateServerRelease,
  commitServerBundle,
  createServerStage,
  stageServerBundle
} from '../lib/server-bundle.ts'
import { writeServerUnit } from '../lib/server-service.ts'
import { ensureSmolvm } from '../lib/smolvm-runtime.ts'
import { CommandFailed, must, runCommand, waitForBody, type Context } from '../lib/system.ts'
import { say, sayError } from '../lib/text.ts'

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
  const stage = createServerStage(ctx)
  let staged = stage
  try {
    await stageServerBundle(ctx, tag, stage)
    const release = await commitServerBundle(ctx, tag, stage)
    staged = ''
    activateServerRelease(ctx, release)
  } finally {
    if (staged) rmSync(staged, { recursive: true, force: true })
  }
}

function carlReady(dir: string, tag: string): boolean {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp) || readFileSync(stamp, 'utf8').trim() !== tag) return false
  return CARL_MODEL_FILES.every((name) => existsSync(join(dir, name)))
}

export async function installModel(ctx: Context, tag: string) {
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  mkdirSync(dir, { recursive: true })
  if (carlReady(dir, tag)) return
  const temp = mkdtempSync(join(tmpdir(), 'pierre-carl-'))
  try {
    await fetchTo(ctx, 'model.zip', join(temp, 'model.zip'), tag)
    await must(ctx.runtime, 'unzip', ['-oq', join(temp, 'model.zip'), '-d', temp])
    rmSync(join(temp, 'model.zip'), { force: true })
    for (const name of CARL_MODEL_FILES) {
      if (!existsSync(join(temp, name))) {
        throw new CommandFailed(1, `L'archive ne contient pas ${name}.`)
      }
    }
    for (const entry of readdirSync(temp)) {
      cpSync(join(temp, entry), join(dir, entry), { recursive: true })
    }
    const stamp = join(dir, 'version')
    writeFileSync(stamp, `${tag}\n`)
    chmodSync(stamp, 0o644)
    rmSync(join(dir, 'model.sha256'), { force: true })
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

export async function ensureLatestCarl(
  ctx: Context
): Promise<'current' | 'installed' | 'unavailable'> {
  const tag = selectCarlRelease(await fetchReleases(ctx))?.tag
  if (!tag) return 'unavailable'
  const dir = join(ctx.runtime.paths.home, 'models', 'carl')
  if (carlReady(dir, tag)) return 'current'
  say(ctx, `Téléchargement de carl ${tag}…`)
  await installModel(ctx, tag)
  return 'installed'
}

async function installLatestModel(ctx: Context) {
  if ((await ensureLatestCarl(ctx)) === 'unavailable') {
    throw new CommandFailed(1, "Aucune version de carl n'est disponible.")
  }
}

async function publishUnit(ctx: Context) {
  const { carlUnit } = ctx.runtime.paths
  await writeServerUnit(ctx)
  if (existsSync(carlUnit)) {
    await runCommand(ctx.runtime, 'systemctl', ['disable', '--now', 'carl'])
    rmSync(carlUnit, { force: true })
  }
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
  await publishUnit(ctx)
  await must(ctx.runtime, 'systemctl', ['enable', 'pierre'])
  await must(ctx.runtime, 'systemctl', ['restart', 'pierre'])
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

export function finalizeConfiguration(ctx: Context) {
  const { pendingEnvFile, previousEnvFile, previousCaddyFile } = ctx.runtime.paths
  rmSync(pendingEnvFile, { force: true })
  rmSync(previousEnvFile, { force: true })
  rmSync(previousCaddyFile, { force: true })
}

async function installFailed(ctx: Context, step: string) {
  const { dim, reset } = ctx.runtime.palette
  ctx.runtime.writeOut(`\n  L’étape « ${step} » n’a pas abouti.\n`)
  ctx.runtime.writeOut(`  Relancez la même commande.\n\n`)
  ctx.runtime.writeOut(`  ${dim}Journal : ${ctx.runtime.paths.installLog}${reset}\n`)
}

function servicesReady(ctx: Context): boolean {
  const carl = join(ctx.runtime.paths.home, 'models', 'carl')
  return (
    isInstalled(ctx.runtime) &&
    existsSync(ctx.runtime.paths.unitFile) &&
    CARL_MODEL_FILES.every((name) => existsSync(join(carl, name)))
  )
}

export async function runInstallation(ctx: Context): Promise<number> {
  const logFile = ctx.runtime.paths.installLog
  mkdirSync(dirname(logFile), { recursive: true })
  writeFileSync(logFile, '', { mode: 0o600 })
  say(ctx, 'Installation des logiciels. Cette opération peut prendre plusieurs minutes.')
  const steps: Array<[string, () => Promise<void>]> = [
    ['Prérequis du serveur', () => verifyInstallMachine(ctx)],
    ['Paquets système', () => installPackages(ctx)],
    ['Moteur de micro-VM', () => ensureSmolvm(ctx)],
    ['Serveur web Caddy', () => installCaddy(ctx)],
    ['Serveur PIERRE', async () => installServerBinaries(ctx, await serverTag(ctx))],
    ['Classement carl', () => installLatestModel(ctx)],
    ['Service PIERRE', () => publishUnit(ctx)]
  ]
  for (const [label, action] of steps) {
    try {
      await runInstallStep(ctx, label, action)
    } catch {
      await installFailed(ctx, label)
      return 1
    }
  }
  return 0
}

async function serverTag(ctx: Context): Promise<string> {
  const forced = ctx.runtime.env['PIERRE_RELEASE']
  if (forced && forced !== 'latest') return forced
  const selected = selectServerRelease(await fetchReleases(ctx))
  if (!selected) throw new CommandFailed(1, 'Aucune version stable du serveur n’est disponible.')
  return selected.tag
}

async function activateHost(ctx: Context, flags: ConfigureFlags): Promise<number> {
  const pending = existsSync(ctx.runtime.paths.pendingEnvFile)
  const current = readEnvMap(pending ? ctx.runtime.paths.pendingEnvFile : ctx.runtime.paths.envFile)
  const published = readEnvMap(ctx.runtime.paths.envFile)
  const merged = mergeConfiguration(current, flags, !isConfigured(ctx.runtime) && !pending)
  if (!merged.ok) {
    sayError(ctx, merged.error)
    ctx.runtime.writeOut(`${INSTALL_USAGE}\n`)
    return 2
  }
  writePrivate(ctx.runtime.paths.pendingEnvFile, formatEnv(merged.env))
  try {
    await activateInstallation(ctx, merged.env)
    if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
      throw new Error('local')
    }
    if (!(await waitForBody(ctx.runtime, `https://${merged.env.host}/up`, 120))) {
      throw new Error('public')
    }
  } catch {
    await rollbackInstallation(ctx)
    sayError(
      ctx,
      'La configuration n’a pas pu être activée. Les valeurs précédentes sont en place.'
    )
    say(ctx, 'La tentative est conservée. Relancez la même commande.')
    return 1
  }
  finalizeConfiguration(ctx)
  const { bold, cyan, green, reset } = ctx.runtime.palette
  say(ctx, `${green}✓${reset}  PIERRE répond sur ${cyan}https://${merged.env.host}${reset}`)
  if (!published.AUTH_PASSWORD) {
    say(ctx, '')
    say(ctx, `${bold}Compte : admin@pierre-ia.org${reset}`)
    say(ctx, `${bold}Mot de passe : ${merged.env.password}${reset}`)
    say(ctx, 'Notez-le maintenant. Il ne sera plus affiché.')
  }
  return 0
}

export async function installCommand(ctx: Context, argv: string[]): Promise<number> {
  const parsed = parseHostArgs(argv)
  if (!parsed.ok) {
    if (parsed.error) sayError(ctx, parsed.error)
    ctx.runtime.writeOut(`${INSTALL_USAGE}\n`)
    return 2
  }
  rememberAssetSource(ctx)
  if (!servicesReady(ctx)) {
    const code = await runInstallation(ctx)
    if (code !== 0) return code
  }
  return activateHost(ctx, parsed.flags)
}
