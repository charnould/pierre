import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { datastorePaths } from './paths'

export type LlmType = 'anthropic' | 'openai' | 'openai-compatible'

export function parseLlmType(value: string): LlmType | '' {
  const type = value.toLowerCase()
  if (type === 'anthropic' || type === 'openai' || type === 'openai-compatible') return type
  return ''
}

export type Providers = {
  llmType: LlmType | ''
  llmBaseUrl: string
  llmApiKey: string
  llmModel: string
  llmEffort: string
  rcsToken: string
  rcsFrom: string
  rcsSecret: string
  emailDomain: string
  emailToken: string
  emailAccount: string
  emailSecret: string
  mailevaClientId: string
  mailevaUsername: string
  mailevaSenderId: string
  mailevaAddress: string
  mailevaSecrets: string
}

const EMPTY: Providers = {
  llmType: '',
  llmBaseUrl: '',
  llmApiKey: '',
  llmModel: '',
  llmEffort: '',
  rcsToken: '',
  rcsFrom: '',
  rcsSecret: '',
  emailDomain: '',
  emailToken: '',
  emailAccount: '',
  emailSecret: '',
  mailevaClientId: '',
  mailevaUsername: '',
  mailevaSenderId: '',
  mailevaAddress: '',
  mailevaSecrets: ''
}

export function emptyProviders(): Providers {
  return { ...EMPTY }
}

export function providersPath(): string {
  return join(datastorePaths().root, 'providers.json')
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function addressText(value: unknown): string {
  return typeof value === 'string' ? mailevaLines(value).join('\n') : ''
}

export function mailevaTarget(username: string): 'sandbox' | 'production' | '' {
  const value = username.trim()
  if (!value) return ''
  return value.toLowerCase().startsWith('sandbox.') ? 'sandbox' : 'production'
}

const POSTAL_CITY = /^\d{5}\s+\S/

export function mailevaLines(address: string): string[] {
  const raw = address
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
  while (raw.length < 6) raw.push('')
  const lines = raw.slice(0, 6)
  if (lines[5]) return lines
  const filled = lines.filter(Boolean)
  const last = filled.at(-1) ?? ''
  if (!POSTAL_CITY.test(last)) return lines
  return ['', filled[0] ?? '', '', filled.slice(1, -1).join(' '), '', last]
}

/** Absent or unreadable file: nothing is configured. The environment is not a fallback. */
export function readProviders(): Providers {
  try {
    const parsed = JSON.parse(readFileSync(providersPath(), 'utf8')) as Record<string, unknown>
    return {
      llmType: parseLlmType(text(parsed['llmType'])),
      llmBaseUrl: text(parsed['llmBaseUrl']),
      llmApiKey: text(parsed['llmApiKey']),
      llmModel: text(parsed['llmModel']),
      llmEffort: text(parsed['llmEffort']),
      rcsToken: text(parsed['rcsToken']),
      rcsFrom: text(parsed['rcsFrom']),
      rcsSecret: text(parsed['rcsSecret']),
      emailDomain: text(parsed['emailDomain']).toLowerCase(),
      emailToken: text(parsed['emailToken']),
      emailAccount: text(parsed['emailAccount']),
      emailSecret: text(parsed['emailSecret']),
      mailevaClientId: text(parsed['mailevaClientId']),
      mailevaUsername: text(parsed['mailevaUsername']),
      mailevaSenderId: text(parsed['mailevaSenderId']),
      mailevaAddress: addressText(parsed['mailevaAddress']),
      mailevaSecrets: text(parsed['mailevaSecrets'])
    }
  } catch (error) {
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
    if (!missing) console.error(`providers.json illisible: ${providersPath()}`)
    return emptyProviders()
  }
}

export function writeProviders(next: Providers): void {
  const path = providersPath()
  mkdirSync(datastorePaths().root, { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(next)}\n`, { mode: 0o600 })
  chmodSync(temporary, 0o600)
  renameSync(temporary, path)
  chmodSync(path, 0o600)
}

export function readAi(providers: Providers = readProviders()): {
  type: LlmType
  model: string
  effort: string
} {
  return {
    type: providers.llmType || 'anthropic',
    model: providers.llmModel || 'claude-sonnet-5-5',
    effort: providers.llmEffort || 'medium'
  }
}

export function llmConfigured(providers: Providers = readProviders()): boolean {
  return Boolean(providers.llmType && providers.llmBaseUrl && providers.llmApiKey)
}

export function rcsConfigured(providers: Providers = readProviders()): boolean {
  return Boolean(providers.rcsToken && providers.rcsFrom && providers.rcsSecret)
}

export function emailConfigured(providers: Providers = readProviders()): boolean {
  return Boolean(
    providers.emailDomain && providers.emailToken && providers.emailAccount && providers.emailSecret
  )
}
