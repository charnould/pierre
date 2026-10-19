import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname } from 'node:path'

import { ensureLatestCarl } from '../lib/carl.ts'
import {
  formatEnv,
  INSTALL_USAGE,
  mergeConfiguration,
  parseHostArgs,
  readEnvMap,
  writePrivate,
  type ConfigureFlags,
  type ParsedEnv
} from '../lib/config.ts'
import {
  activateServerRelease,
  findServerRelease,
  publishServerBundle,
  serverInstalled
} from '../lib/server-bundle.ts'
import { writeServerUnit } from '../lib/server-service.ts'
import { ensureSmolvm } from '../lib/smolvm-runtime.ts'
import { CommandFailed, must, runCommand, waitForBody, type Context } from '../lib/system.ts'
import { say, sayError, spin } from '../lib/text.ts'

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

function rememberAssetSource(ctx: Context) {
  const directory = ctx.runtime.env['PIERRE_ASSET_DIR']
  if (!directory) return
  writePrivate(ctx.runtime.paths.assetSourceFile, `${directory}\n`)
}

async function packagesInstalled(ctx: Context): Promise<boolean> {
  const result = await runCommand(ctx.runtime, 'dpkg-query', [
    '-W',
    '-f',
    '${Package} ${db:Status-Status}\n',
    ...PACKAGES
  ])
  const installed = new Set(
    result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith(' installed'))
      .map((line) => line.slice(0, line.lastIndexOf(' ')))
  )
  return PACKAGES.every((name) => installed.has(name))
}

async function runInstallStep(ctx: Context, label: string, action: () => Promise<void>) {
  const logFile = ctx.runtime.paths.installLog
  mkdirSync(dirname(logFile), { recursive: true })
  appendFileSync(logFile, `\n=== ${label} ===\n`)
  chmodSync(logFile, 0o600)
  try {
    await spin(ctx, label, action)
  } catch (error) {
    const output =
      error instanceof CommandFailed ? error.output : error instanceof Error ? error.message : ''
    if (output) appendFileSync(logFile, output.endsWith('\n') ? output : `${output}\n`)
    throw error
  }
}

async function ensurePackages(ctx: Context) {
  if (await packagesInstalled(ctx)) return
  await must(ctx.runtime, 'apt-get', ['update', '-qq'], { env: aptEnv })
  await must(ctx.runtime, 'apt-get', ['install', '-y', ...PACKAGES], { env: aptEnv })
}

async function ensureCaddy(ctx: Context) {
  if (ctx.runtime.commandExists('caddy')) return
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

async function ensureServer(ctx: Context) {
  if (serverInstalled(ctx)) return
  const release = await findServerRelease(ctx)
  if (!release) throw new CommandFailed(1, 'Aucune version stable du serveur n’est disponible.')
  activateServerRelease(ctx, await publishServerBundle(ctx, release))
}

async function ensureCarl(ctx: Context) {
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

async function writeCaddy(ctx: Context, host: string) {
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

async function activateInstallation(ctx: Context, env: ParsedEnv) {
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

async function rollbackInstallation(ctx: Context) {
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

function finalizeConfiguration(ctx: Context) {
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

async function runInstallation(ctx: Context): Promise<number> {
  const logFile = ctx.runtime.paths.installLog
  mkdirSync(dirname(logFile), { recursive: true })
  writeFileSync(logFile, '', { mode: 0o600 })
  const steps: Array<[string, () => Promise<void>]> = [
    ['Paquets', () => ensurePackages(ctx)],
    ['Micro-VM', () => ensureSmolvm(ctx)],
    ['Caddy', () => ensureCaddy(ctx)],
    ['Server', () => ensureServer(ctx)],
    ['Carl', () => ensureCarl(ctx)]
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

async function activateHost(ctx: Context, flags: ConfigureFlags): Promise<number> {
  const pending = existsSync(ctx.runtime.paths.pendingEnvFile)
  const current = readEnvMap(pending ? ctx.runtime.paths.pendingEnvFile : ctx.runtime.paths.envFile)
  const published = readEnvMap(ctx.runtime.paths.envFile)
  const merged = mergeConfiguration(current, flags)
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
  const { bold, reset } = ctx.runtime.palette
  say(ctx, '')
  say(ctx, `  https://${merged.env.host}`)
  if (!published.AUTH_PASSWORD) {
    say(ctx, '')
    say(ctx, '  admin@pierre-ia.org')
    say(ctx, `  ${bold}${merged.env.password}${reset}`)
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
  const code = await runInstallation(ctx)
  if (code !== 0) return code
  return activateHost(ctx, parsed.flags)
}
