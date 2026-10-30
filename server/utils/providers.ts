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
      emailSecret: text(parsed['emailSecret'])
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
