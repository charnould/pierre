import { randomBytes } from 'node:crypto'
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs'

import type { Runtime } from './system.ts'

export const ENV_KEYS = [
  'HOST',
  'AUTH_PASSWORD',
  'AUTH_SECRET',
  'AUTH_BEARER',
  'AI_TYPE',
  'AI_BASE_URL',
  'AI_API_KEY',
  'CM_RCS_PRODUCT_TOKEN',
  'CM_RCS_FROM',
  'CM_RCS_WEBHOOK_SECRET',
  'CM_EMAIL_DOMAIN',
  'CM_EMAIL_PRODUCT_TOKEN',
  'CM_EMAIL_ACCOUNT_ID',
  'CM_EMAIL_WEBHOOK_SECRET'
] as const

export type EnvKey = (typeof ENV_KEYS)[number]
export type EnvMap = Partial<Record<EnvKey, string>>

export type ParsedEnv = {
  host: string
  password: string
  authSecret: string
  authBearer: string
  aiType: 'anthropic' | 'openai'
  aiBaseUrl: string
  aiApiKey: string
  cmRcsProductToken: string
  cmRcsFrom: string
  cmRcsWebhookSecret: string
  cmEmailDomain: string
  cmEmailProductToken: string
  cmEmailAccountId: string
  cmEmailWebhookSecret: string
}

export type ConfigureFlags = {
  host?: string
  provider?: string
  url?: string
  apiKey?: string
  rcsToken?: string
  rcsFrom?: string
  rcsSecret?: string
  cmEmailDomain?: string
  cmEmailToken?: string
  cmEmailAccount?: string
  cmEmailSecret?: string
}

export type MergeResult =
  | {
      ok: true
      env: ParsedEnv
      providerChanged: boolean
      passwordGenerated: boolean
      rcsSecretGenerated: boolean
    }
  | { ok: false; error: string }

const CM_TOKEN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const FLAG_NAMES = {
  host: 'host',
  provider: 'provider',
  url: 'url',
  'api-key': 'apiKey',
  'rcs-token': 'rcsToken',
  'rcs-from': 'rcsFrom',
  'rcs-secret': 'rcsSecret',
  'cm-email-domain': 'cmEmailDomain',
  'cm-email-token': 'cmEmailToken',
  'cm-email-account': 'cmEmailAccount',
  'cm-email-webhook-secret': 'cmEmailSecret'
} as const

type FlagName = keyof typeof FLAG_NAMES

export const CONFIGURE_USAGE = [
  'Usage :',
  '  pierre configure --host assistant.exemple.org --provider openai --url https://api.openai.com/v1 --api-key CLE',
  '  pierre configure --rcs-token UUID --rcs-from NOM',
  '  pierre configure --cm-email-domain dribble.football --cm-email-token UUID --cm-email-account UUID --cm-email-webhook-secret CLE',
  ''
].join('\n')

export function cleanHost(host: string): string {
  return host.replace(/^https?:\/\//, '').split('/')[0] ?? ''
}

export function readEnvMap(file: string): EnvMap {
  if (!existsSync(file)) return {}
  const map: EnvMap = {}
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/\r$/, '')
    const index = line.indexOf('=')
    if (index <= 0) continue
    const key = line.slice(0, index)
    if (!ENV_KEYS.includes(key as EnvKey)) continue
    map[key as EnvKey] = line.slice(index + 1)
  }
  return map
}

export function readEnvValue(file: string, key: EnvKey): string {
  return readEnvMap(file)[key] ?? ''
}

export function formatEnv(env: ParsedEnv): string {
  return [
    `HOST=${env.host}`,
    `AUTH_PASSWORD=${env.password}`,
    `AUTH_SECRET=${env.authSecret}`,
    `AUTH_BEARER=${env.authBearer}`,
    `AI_TYPE=${env.aiType}`,
    `AI_BASE_URL=${env.aiBaseUrl}`,
    `AI_API_KEY=${env.aiApiKey}`,
    `CM_RCS_PRODUCT_TOKEN=${env.cmRcsProductToken}`,
    `CM_RCS_FROM=${env.cmRcsFrom}`,
    `CM_RCS_WEBHOOK_SECRET=${env.cmRcsWebhookSecret}`,
    `CM_EMAIL_DOMAIN=${env.cmEmailDomain}`,
    `CM_EMAIL_PRODUCT_TOKEN=${env.cmEmailProductToken}`,
    `CM_EMAIL_ACCOUNT_ID=${env.cmEmailAccountId}`,
    `CM_EMAIL_WEBHOOK_SECRET=${env.cmEmailWebhookSecret}`,
    ''
  ].join('\n')
}

export function writePrivate(file: string, content: string) {
  const temporary = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  writeFileSync(temporary, content, { mode: 0o600 })
  chmodSync(temporary, 0o600)
  renameSync(temporary, file)
}

export function validCmToken(value: string): boolean {
  return CM_TOKEN.test(value)
}

export function isInstalled(runtime: Runtime): boolean {
  try {
    accessSync(runtime.paths.bin, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export function isConfigured(runtime: Runtime): boolean {
  return requiredReady(readEnvMap(runtime.paths.envFile))
}

export function parseConfigureArgs(
  argv: string[]
): { ok: true; flags: ConfigureFlags } | { ok: false; error: string } {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { ok: false, error: '' }
  }
  const flags: ConfigureFlags = {}
  const seen = new Set<FlagName>()
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? ''
    if (token.includes('=')) return { ok: false, error: `Écrivez ${token.split('=')[0]} VALEUR.` }
    if (!token.startsWith('--') || token === '--') {
      return { ok: false, error: `Option inconnue : ${token}` }
    }
    const name = token.slice(2)
    if (!isFlagName(name)) return { ok: false, error: `Option inconnue : --${name}` }
    if (seen.has(name)) return { ok: false, error: `Option dupliquée : --${name}` }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--') || value.length === 0) {
      return { ok: false, error: `--${name} attend une valeur.` }
    }
    seen.add(name)
    flags[FLAG_NAMES[name]] = value
    index += 1
  }
  return { ok: true, flags }
}

export function mergeConfiguration(
  current: EnvMap,
  flags: ConfigureFlags,
  first: boolean
): MergeResult {
  if (first && (!flags.host || !flags.provider || !flags.url || !flags.apiKey)) {
    return {
      ok: false,
      error: 'Le premier paramétrage exige --host, --provider, --url et --api-key.'
    }
  }
  const providerError = completeFlags('le fournisseur', [
    ['--provider', flags.provider],
    ['--url', flags.url],
    ['--api-key', flags.apiKey]
  ])
  if (providerError) return { ok: false, error: providerError }
  const rcsTouched =
    flags.rcsToken !== undefined || flags.rcsFrom !== undefined || flags.rcsSecret !== undefined
  if (rcsTouched && (!flags.rcsToken || !flags.rcsFrom)) {
    return { ok: false, error: 'Le RCS exige --rcs-token et --rcs-from ensemble.' }
  }
  const emailError = completeFlags("l'email", [
    ['--cm-email-domain', flags.cmEmailDomain],
    ['--cm-email-token', flags.cmEmailToken],
    ['--cm-email-account', flags.cmEmailAccount],
    ['--cm-email-webhook-secret', flags.cmEmailSecret]
  ])
  if (emailError) return { ok: false, error: emailError }

  const host = cleanHost(flags.host ?? current.HOST ?? '')
  if (!host || /\s/.test(host)) return { ok: false, error: 'Le domaine est invalide.' }
  const password = current.AUTH_PASSWORD || randomBytes(32).toString('hex')
  if (password.length < 8 || password.length > 128) {
    return { ok: false, error: 'AUTH_PASSWORD doit contenir entre 8 et 128 caractères.' }
  }
  const authSecret = current.AUTH_SECRET || randomBytes(32).toString('hex')
  const authBearer = current.AUTH_BEARER || randomBytes(32).toString('hex')
  if (authSecret.length < 32)
    return { ok: false, error: 'AUTH_SECRET doit contenir au moins 32 caractères.' }
  if (!authBearer) return { ok: false, error: 'AUTH_BEARER est obligatoire.' }

  const provider = (flags.provider ?? current.AI_TYPE ?? '').toLowerCase()
  if (provider !== 'anthropic' && provider !== 'openai') {
    return { ok: false, error: '--provider vaut openai ou anthropic.' }
  }
  const aiBaseUrl = flags.url ?? current.AI_BASE_URL ?? ''
  const aiApiKey = flags.apiKey ?? current.AI_API_KEY ?? ''
  if (!validHttpsUrl(aiBaseUrl) || !aiApiKey) {
    return { ok: false, error: '--url doit être une adresse https et --api-key est obligatoire.' }
  }

  const rcsToken = flags.rcsToken ?? current.CM_RCS_PRODUCT_TOKEN ?? ''
  const rcsFrom = flags.rcsFrom ?? current.CM_RCS_FROM ?? ''
  let rcsSecret = flags.rcsSecret ?? current.CM_RCS_WEBHOOK_SECRET ?? ''
  let rcsSecretGenerated = false
  if (rcsToken || rcsFrom || rcsSecret) {
    if (!rcsTouched && (!rcsToken || !rcsFrom || !rcsSecret)) {
      return { ok: false, error: 'Le RCS enregistré est incomplet.' }
    }
    if (!rcsToken || !rcsFrom) {
      return { ok: false, error: 'Le RCS exige --rcs-token et --rcs-from ensemble.' }
    }
    if (!validCmToken(rcsToken)) {
      return { ok: false, error: '--rcs-token doit être un UUID avec ses tirets.' }
    }
    if (!rcsSecret) {
      rcsSecret = randomBytes(32).toString('hex')
      rcsSecretGenerated = true
    }
  }

  const emailTouched =
    flags.cmEmailDomain !== undefined ||
    flags.cmEmailToken !== undefined ||
    flags.cmEmailAccount !== undefined ||
    flags.cmEmailSecret !== undefined
  const cmEmailDomain = (flags.cmEmailDomain ?? current.CM_EMAIL_DOMAIN ?? '').toLowerCase()
  const cmEmailProductToken = flags.cmEmailToken ?? current.CM_EMAIL_PRODUCT_TOKEN ?? ''
  const cmEmailAccountId = flags.cmEmailAccount ?? current.CM_EMAIL_ACCOUNT_ID ?? ''
  const cmEmailWebhookSecret = flags.cmEmailSecret ?? current.CM_EMAIL_WEBHOOK_SECRET ?? ''
  if (cmEmailDomain || cmEmailProductToken || cmEmailAccountId || cmEmailWebhookSecret) {
    if (
      !emailTouched &&
      (!cmEmailDomain || !cmEmailProductToken || !cmEmailAccountId || !cmEmailWebhookSecret)
    ) {
      return { ok: false, error: "L'email enregistré est incomplet." }
    }
    if (!cmEmailDomain || !cmEmailProductToken || !cmEmailAccountId || !cmEmailWebhookSecret) {
      return {
        ok: false,
        error:
          "L'email exige --cm-email-domain, --cm-email-token, --cm-email-account et --cm-email-webhook-secret ensemble."
      }
    }
    if (!DOMAIN.test(cmEmailDomain)) return { ok: false, error: '--cm-email-domain est invalide.' }
    if (!validCmToken(cmEmailProductToken)) {
      return { ok: false, error: '--cm-email-token doit être un UUID avec ses tirets.' }
    }
    if (!validCmToken(cmEmailAccountId)) {
      return { ok: false, error: '--cm-email-account doit être un UUID avec ses tirets.' }
    }
  }

  return {
    ok: true,
    providerChanged:
      flags.provider !== undefined || flags.url !== undefined || flags.apiKey !== undefined,
    passwordGenerated: !current.AUTH_PASSWORD,
    rcsSecretGenerated,
    env: {
      host,
      password,
      authSecret,
      authBearer,
      aiType: provider,
      aiBaseUrl,
      aiApiKey,
      cmRcsProductToken: rcsToken,
      cmRcsFrom: rcsFrom,
      cmRcsWebhookSecret: rcsSecret,
      cmEmailDomain,
      cmEmailProductToken,
      cmEmailAccountId,
      cmEmailWebhookSecret
    }
  }
}

function requiredReady(map: EnvMap): boolean {
  const password = map.AUTH_PASSWORD ?? ''
  const provider = (map.AI_TYPE ?? '').toLowerCase()
  return Boolean(
    cleanHost(map.HOST ?? '') &&
    password.length >= 8 &&
    password.length <= 128 &&
    (map.AUTH_SECRET ?? '').length >= 32 &&
    map.AUTH_BEARER &&
    (provider === 'anthropic' || provider === 'openai') &&
    map.AI_BASE_URL &&
    map.AI_API_KEY
  )
}

function isFlagName(value: string): value is FlagName {
  return Object.hasOwn(FLAG_NAMES, value)
}

function completeFlags(label: string, pairs: Array<[string, string | undefined]>): string | null {
  const present = pairs.some(([, value]) => value !== undefined)
  const missing = pairs.find(([, value]) => value === undefined)
  if (!present || !missing) return null
  return `${missing[0]} est obligatoire lorsque ${label} est modifié.`
}

function validHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}
