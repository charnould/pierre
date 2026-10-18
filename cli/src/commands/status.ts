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
import { providerLabel, renderStatus, type StatusLine } from '../lib/output.ts'
import { runCommand, type Context } from '../lib/system.ts'

const CONFIGURE_HINT = 'Configurer : pierre configure --host DOMAINE'
const PROVIDERS_HINT = 'Dans le bureau : Administration → Prestataires.'

export async function showStatus(ctx: Context): Promise<number> {
  const lines = await collectStatus(ctx)
  ctx.runtime.writeOut(renderStatus(ctx, lines))
  return lines.some((line) => line.level === 'bad') ? 1 : 0
}

export async function collectStatus(ctx: Context): Promise<StatusLine[]> {
  if (!isInstalled(ctx.runtime)) {
    return [
      {
        level: 'bad',
        label: 'Installation',
        value: 'absente',
        hint: 'Installer : pierre install'
      }
    ]
  }
  const configured = isConfigured(ctx.runtime)
  const providers = readProviderStatus(ctx.runtime.paths.home)
  const releases = await fetchReleases(ctx)
  const serverVersion = await installedServer(ctx)
  const serverLatest = selectServerRelease(releases)?.tag ?? ''
  const carlVersion = installedCarl(ctx)
  const carlLatest = selectCarlRelease(releases)?.tag ?? ''
  const cliLatest = selectCliRelease(releases)?.tag ?? ''
  const lines: StatusLine[] = [{ level: 'ok', label: 'Installation', value: 'complète' }]
  if (!configured) {
    lines.push({
      level: 'bad',
      label: 'Configuration',
      value: existsSync(ctx.runtime.paths.pendingEnvFile) ? 'en attente' : 'absente',
      hint: CONFIGURE_HINT
    })
    lines.push(installedLine('Serveur', serverVersion, serverLatest))
    lines.push(installedLine('Classement', carlVersion, carlLatest))
  } else {
    const host = readEnvValue(ctx.runtime.paths.envFile, 'HOST')
    const local = await serviceUp(ctx)
    const publicUp = host ? await endpointUp(ctx, `https://${host}/up`) : false
    const carlUp = local ? await carlUpNow(ctx) : false
    lines.push({
      level: publicUp ? 'ok' : 'bad',
      label: 'Site',
      value: host ? `https://${host}` : 'absent',
      hint: publicUp ? undefined : 'Vérifiez le DNS, les ports 80 et 443, puis relancez pierre.'
    })
    lines.push({
      level: local ? 'ok' : 'bad',
      label: 'Serveur',
      value: local ? `opérationnel · ${serverVersion}` : 'indisponible',
      hint: local ? undefined : 'Voir les journaux : pierre logs'
    })
    lines.push({
      level: carlUp ? 'ok' : 'bad',
      label: 'Classement',
      value: carlUp ? `opérationnel · ${carlVersion}` : 'indisponible',
      hint: carlUp ? undefined : 'Relancer : pierre update'
    })
    lines.push(providerLine(providers))
  }
  lines.push(channelLine('RCS', providers.rcs))
  lines.push(channelLine('Email', providers.email))
  const update = updateHint(
    ctx.version,
    cliLatest,
    serverVersion,
    serverLatest,
    carlVersion,
    carlLatest
  )
  if (update) lines.push(update)
  return lines
}

function installedLine(label: string, installed: string, latest: string): StatusLine {
  const newer = latest !== '' && installed !== 'absent' && versionGreater(latest, installed)
  return {
    level: installed === 'absent' ? 'warn' : 'ok',
    label,
    value: newer ? `${installed} · ${latest} disponible` : installed
  }
}

function updateHint(
  cli: string,
  cliLatest: string,
  server: string,
  serverLatest: string,
  carl: string,
  carlLatest: string
): StatusLine | null {
  const available = [
    cliLatest && versionGreater(cliLatest, cli) ? cliLatest : '',
    serverLatest && server !== 'absent' && versionGreater(serverLatest, server) ? serverLatest : '',
    carlLatest && carl !== 'absent' && versionGreater(carlLatest, carl) ? carlLatest : ''
  ].filter(Boolean)
  if (available.length === 0) return null
  return {
    level: 'warn',
    label: 'Mise à jour',
    value: available.join(' · '),
    hint: 'Mettre à jour : pierre update'
  }
}

type ProviderStatus = {
  aiType: string
  aiBaseUrl: string
  rcs: boolean
  email: boolean
}

function readProviderStatus(home: string): ProviderStatus {
  const empty: ProviderStatus = { aiType: '', aiBaseUrl: '', rcs: false, email: false }
  const path = join(home, 'providers.json')
  if (!existsSync(path)) return empty
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    const text = (key: string) => {
      const value = parsed[key]
      return typeof value === 'string' ? value.trim() : ''
    }
    const aiType = text('aiType').toLowerCase()
    const aiBaseUrl = text('aiBaseUrl')
    const ai =
      (aiType === 'openai' || aiType === 'anthropic') && Boolean(aiBaseUrl && text('aiApiKey'))
    return {
      aiType: ai ? aiType : '',
      aiBaseUrl: ai ? aiBaseUrl : '',
      rcs: Boolean(text('rcsToken') && text('rcsFrom') && text('rcsSecret')),
      email: Boolean(
        text('emailDomain') && text('emailToken') && text('emailAccount') && text('emailSecret')
      )
    }
  } catch {
    return empty
  }
}

function channelLine(label: string, ready: boolean): StatusLine {
  return ready
    ? { level: 'ok', label, value: 'paramétré' }
    : { level: 'warn', label, value: 'non paramétré' }
}

function providerLine(providers: ProviderStatus): StatusLine {
  if (!providers.aiType || !providers.aiBaseUrl) {
    return {
      level: 'warn',
      label: 'Intelligence',
      value: 'non paramétrée',
      hint: PROVIDERS_HINT
    }
  }
  return {
    level: 'ok',
    label: 'Intelligence',
    value: `${providerLabel(providers.aiType)} · ${providers.aiBaseUrl}`
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
