import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { datastorePaths } from './paths'

export type AiType = 'openai' | 'anthropic'

export type Providers = {
  aiType: AiType | ''
  aiBaseUrl: string
  aiApiKey: string
  rcsToken: string
  rcsFrom: string
  rcsSecret: string
  emailDomain: string
  emailToken: string
  emailAccount: string
  emailSecret: string
}

const EMPTY: Providers = {
  aiType: '',
  aiBaseUrl: '',
  aiApiKey: '',
  rcsToken: '',
  rcsFrom: '',
  rcsSecret: '',
  emailDomain: '',
  emailToken: '',
  emailAccount: '',
  emailSecret: ''
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

/** Absent or unreadable file: nothing is configured. The environment is not a fallback. */
export function readProviders(): Providers {
  try {
    const parsed = JSON.parse(readFileSync(providersPath(), 'utf8')) as Record<string, unknown>
    const aiType = text(parsed['aiType']).toLowerCase()
    return {
      aiType: aiType === 'openai' || aiType === 'anthropic' ? aiType : '',
      aiBaseUrl: text(parsed['aiBaseUrl']),
      aiApiKey: text(parsed['aiApiKey']),
      rcsToken: text(parsed['rcsToken']),
      rcsFrom: text(parsed['rcsFrom']),
      rcsSecret: text(parsed['rcsSecret']),
      emailDomain: text(parsed['emailDomain']).toLowerCase(),
      emailToken: text(parsed['emailToken']),
      emailAccount: text(parsed['emailAccount']),
      emailSecret: text(parsed['emailSecret'])
    }
  } catch {
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

export function aiConfigured(providers: Providers = readProviders()): boolean {
  return Boolean(providers.aiType && providers.aiBaseUrl && providers.aiApiKey)
}

export function rcsConfigured(providers: Providers = readProviders()): boolean {
  return Boolean(providers.rcsToken && providers.rcsFrom && providers.rcsSecret)
}

export function emailConfigured(providers: Providers = readProviders()): boolean {
  return Boolean(
    providers.emailDomain && providers.emailToken && providers.emailAccount && providers.emailSecret
  )
}
