import { openDatastore } from './datastore-db'
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
  mailevaClientSecret: string
  mailevaPassword: string
  mailevaTotpSecret: string
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
  mailevaClientSecret: '',
  mailevaPassword: '',
  mailevaTotpSecret: ''
}

export function emptyProviders(): Providers {
  return { ...EMPTY }
}

export const PROVIDERS_SETUP_ID = 'providers'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const POSTAL_CITY = /^\d{5}\s+\S/

let cache: { database: string; providers: Providers } | null = null

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

function parseProviders(parsed: Record<string, unknown>): Providers {
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
    mailevaClientSecret: text(parsed['mailevaClientSecret']),
    mailevaPassword: text(parsed['mailevaPassword']),
    mailevaTotpSecret: text(parsed['mailevaTotpSecret'])
  }
}

async function providersKey(): Promise<CryptoKey> {
  const secret = Bun.env['AUTH_SECRET']
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 characters')
  }
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, [
    'deriveKey'
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('pierre-providers-v1'),
      info: encoder.encode('providers')
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function sealProviders(providers: Providers): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await providersKey(),
    encoder.encode(JSON.stringify(providers))
  )
  return `v1.${iv.toBase64()}.${new Uint8Array(encrypted).toBase64()}`
}

async function openProviders(payload: string): Promise<Providers> {
  const parts = payload.trim().split('.')
  const [version, iv, data] = parts
  if (parts.length !== 3 || version !== 'v1' || !iv || !data) {
    throw new Error('Prestataires illisibles.')
  }
  const key = await providersKey()
  try {
    const clear = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.fromBase64(iv) },
      key,
      Uint8Array.fromBase64(data)
    )
    const parsed = JSON.parse(decoder.decode(clear)) as unknown
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Prestataires illisibles.')
    }
    return parseProviders(parsed as Record<string, unknown>)
  } catch {
    throw new Error('Prestataires illisibles.')
  }
}

function remember(providers: Providers): Providers {
  cache = { database: datastorePaths().database, providers: { ...providers } }
  return { ...providers }
}

function readStoredText(): string | null {
  const db = openDatastore({ readonly: true })
  try {
    const row = db
      .query<{ content: Uint8Array }, [string]>('SELECT content FROM setup WHERE id = ?')
      .get(PROVIDERS_SETUP_ID)
    return row ? decoder.decode(row.content) : null
  } finally {
    db.close()
  }
}

function writeStoredText(stored: string): void {
  const db = openDatastore()
  try {
    db.run(
      'INSERT INTO setup (id, content) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content',
      [PROVIDERS_SETUP_ID, encoder.encode(stored)]
    )
  } finally {
    db.close()
  }
}

export function readProviders(): Providers {
  if (cache?.database === datastorePaths().database) return { ...cache.providers }
  return emptyProviders()
}

export async function loadProviders(): Promise<Providers> {
  const stored = readStoredText()
  if (stored === null) return remember(emptyProviders())
  return remember(await openProviders(stored))
}

export async function writeProviders(next: Providers): Promise<void> {
  const normalized = parseProviders(next)
  writeStoredText(await sealProviders(normalized))
  remember(normalized)
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
