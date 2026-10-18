import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { isConfigured, isInstalled, readEnvValue } from '../lib/config.ts'
import {
  fetchReleases,
  selectCarlRelease,
  selectCliRelease,
  selectServerRelease,
  versionGreater
} from '../lib/github.ts'
import { renderStatus, type StatusLine } from '../lib/output.ts'
import { runCommand, type Context } from '../lib/system.ts'

const CONFIGURE_HINT = 'Configurer : pierre configure --host DOMAINE'

export async function showStatus(ctx: Context): Promise<number> {
  const { lines } = await collectStatus(ctx)
  ctx.runtime.writeOut(renderStatus(ctx, lines))
  return lines.some((line) => line.level === 'bad') ? 1 : 0
}

export async function collectStatus(ctx: Context): Promise<{ lines: StatusLine[] }> {
  if (!isInstalled(ctx.runtime)) {
    return {
      lines: [
        {
          level: 'bad',
          label: 'installation',
          value: 'absente',
          hint: 'Installer : pierre install'
        }
      ]
    }
  }
  const configured = isConfigured(ctx.runtime)
  const releases = await fetchReleases(ctx)
  const serverVersion = await installedServer(ctx)
  const serverLatest = selectServerRelease(releases)?.tag ?? ''
  const carlVersion = installedCarl(ctx)
  const carlLatest = selectCarlRelease(releases)?.tag ?? ''
  const cliLatest = selectCliRelease(releases)?.tag ?? ''
  const lines: StatusLine[] = [versionLine('cli', ctx.version, cliLatest, true)]
  if (!configured) {
    lines.unshift({
      level: 'bad',
      label: 'configuration',
      value: existsSync(ctx.runtime.paths.pendingEnvFile) ? 'en attente' : 'absente',
      hint: CONFIGURE_HINT
    })
    lines.push(versionLine('server', serverVersion, serverLatest, null))
    lines.push(versionLine('carl', carlVersion, carlLatest, null))
  } else {
    const host = readEnvValue(ctx.runtime.paths.envFile, 'HOST')
    const local = await serviceUp(ctx)
    const publicUp = host ? await endpointUp(ctx, `https://${host}/up`) : false
    const carlUp = local ? await carlUpNow(ctx) : false
    lines.unshift({
      level: publicUp ? 'ok' : 'bad',
      label: 'www',
      value: host ? `https://${host}` : 'absent',
      hint: publicUp ? undefined : 'Vérifiez le DNS, les ports 80 et 443, puis relancez pierre.'
    })
    lines.push(versionLine('server', serverVersion, serverLatest, local))
    lines.push(versionLine('carl', carlVersion, carlLatest, carlUp))
  }
  return { lines }
}

function versionLine(
  label: string,
  installed: string,
  latest: string,
  up: boolean | null
): StatusLine {
  const value = !installed || installed === 'absent' ? 'absent' : installed
  const next =
    value !== 'absent' && latest && versionGreater(latest, installed) ? latest : undefined
  if (up === null) return { level: installed === 'absent' ? 'warn' : 'ok', label, value, next }
  if (up) return { level: 'ok', label, value, next }
  return {
    level: 'bad',
    label,
    value: installed === 'absent' ? 'indisponible' : value,
    next,
    hint: label === 'carl' ? 'Relancer : pierre update' : 'Voir les journaux : pierre logs'
  }
}

async function installedServer(ctx: Context): Promise<string> {
  const result = await runCommand(ctx.runtime, ctx.runtime.paths.bin, ['--version'])
  return result.stdout.trim().split(/\s+/)[0] || 'absent'
}

function installedCarl(ctx: Context): string {
  const file = join(ctx.runtime.paths.home, 'models', 'carl', 'version')
  if (!existsSync(file)) return 'absent'
  return readFileSync(file, 'utf8').replace(/\s+/g, '') || 'absent'
}

async function serviceUp(ctx: Context): Promise<boolean> {
  const active = await runCommand(ctx.runtime, 'systemctl', ['is-active', 'pierre'])
  if (active.stdout.trim() !== 'active') return false
  return endpointUp(ctx, 'http://127.0.0.1:3000/up')
}

async function endpointUp(ctx: Context, url: string): Promise<boolean> {
  const response = await ctx.runtime.request(url, { timeoutMs: 5000 })
  return response.status >= 200 && response.status < 300 && response.body.trim() === 'ok'
}

async function carlUpNow(ctx: Context): Promise<boolean> {
  const response = await ctx.runtime.request('http://127.0.0.1:3000/api/models/carl', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"texte":"la chaudière est en panne"}',
    timeoutMs: 8000
  })
  return response.status === 200
}
