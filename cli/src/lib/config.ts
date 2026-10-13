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
  'CM_EMAIL_PRODUCT_TOKEN',
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
  cmEmailProductToken: string
  cmEmailWebhookSecret: string
}

export type ParseResult = { ok: true; env: ParsedEnv } | { ok: false; error: string }

const CM_TOKEN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

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
    `CM_EMAIL_PRODUCT_TOKEN=${env.cmEmailProductToken}`,
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

const fail = (error: string): ParseResult => ({ ok: false, error })

function completeGroup(label: string, pairs: Array<[string, string]>): string | null {
  const missing = pairs.find(([, value]) => !value)
  const filled = pairs.some(([, value]) => value)
  if (!filled || !missing) return null
  return `${missing[0]} est obligatoire lorsque ${label} est activé.`
}

export function parseDotenv(
  text: string,
  mode: 'install' | 'configure',
  current: EnvMap
): ParseResult {
  const seen = new Set<string>()
  const values: Record<string, string> = {}
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue
    const index = line.indexOf('=')
    if (index === -1) return fail(`Ligne invalide : ${line}`)
    const key = line.slice(0, index)
    const value = line.slice(index + 1)
    if (!ENV_KEYS.includes(key as EnvKey)) return fail(`Variable inconnue : ${key}`)
    if (seen.has(key)) return fail(`Variable dupliquée : ${key}`)
    if (value === 'AUTO') return fail(`${key} : AUTO n’existe plus.`)
    seen.add(key)
    values[key] = key === 'AI_TYPE' ? value.toLowerCase() : value
  }
  if (seen.size !== ENV_KEYS.length)
    return fail(`Le bloc doit contenir les ${ENV_KEYS.length} variables attendues.`)

  const host = cleanHost(values['HOST'] ?? '')
  if (!host) return fail('HOST est obligatoire.')
  const password = values['AUTH_PASSWORD'] ?? ''
  if (password.length < 8 || password.length > 128) {
    return fail('AUTH_PASSWORD doit contenir entre 8 et 128 caractères.')
  }

  const authSecret = values['AUTH_SECRET'] ?? ''
  const authBearer = values['AUTH_BEARER'] ?? ''
  if (mode === 'configure') {
    if (password !== (current['AUTH_PASSWORD'] ?? '')) {
      return fail('AUTH_PASSWORD est un secret de bootstrap et doit rester inchangé.')
    }
    if (authSecret !== (current['AUTH_SECRET'] ?? ''))
      return fail('AUTH_SECRET doit rester inchangé.')
    if (authBearer !== (current['AUTH_BEARER'] ?? ''))
      return fail('AUTH_BEARER doit rester inchangé.')
  }
  if (authSecret.length < 32) return fail('AUTH_SECRET doit contenir au moins 32 caractères.')
  if (!authBearer) return fail('AUTH_BEARER est obligatoire.')

  const aiType = values['AI_TYPE'] ?? ''
  if (aiType !== 'anthropic' && aiType !== 'openai')
    return fail('AI_TYPE vaut anthropic ou openai.')
  const aiBaseUrl = values['AI_BASE_URL'] ?? ''
  const aiApiKey = values['AI_API_KEY'] ?? ''
  if (!aiBaseUrl || !aiApiKey) return fail('AI_BASE_URL et AI_API_KEY sont obligatoires.')

  const cmRcsProductToken = values['CM_RCS_PRODUCT_TOKEN'] ?? ''
  const cmRcsFrom = values['CM_RCS_FROM'] ?? ''
  const cmRcsWebhookSecret = values['CM_RCS_WEBHOOK_SECRET'] ?? ''
  const rcsError = completeGroup('le RCS', [
    ['CM_RCS_PRODUCT_TOKEN', cmRcsProductToken],
    ['CM_RCS_FROM', cmRcsFrom],
    ['CM_RCS_WEBHOOK_SECRET', cmRcsWebhookSecret]
  ])
  if (rcsError) return fail(rcsError)
  if (cmRcsProductToken && !validCmToken(cmRcsProductToken)) {
    return fail('CM_RCS_PRODUCT_TOKEN doit être un UUID avec ses tirets.')
  }

  const cmEmailProductToken = values['CM_EMAIL_PRODUCT_TOKEN'] ?? ''
  const cmEmailWebhookSecret = values['CM_EMAIL_WEBHOOK_SECRET'] ?? ''
  const emailError = completeGroup("l'email", [
    ['CM_EMAIL_PRODUCT_TOKEN', cmEmailProductToken],
    ['CM_EMAIL_WEBHOOK_SECRET', cmEmailWebhookSecret]
  ])
  if (emailError) return fail(emailError)
  if (cmEmailProductToken && !validCmToken(cmEmailProductToken)) {
    return fail('CM_EMAIL_PRODUCT_TOKEN doit être un UUID avec ses tirets.')
  }

  return {
    ok: true,
    env: {
      host,
      password,
      authSecret,
      authBearer,
      aiType,
      aiBaseUrl,
      aiApiKey,
      cmRcsProductToken,
      cmRcsFrom,
      cmRcsWebhookSecret,
      cmEmailProductToken,
      cmEmailWebhookSecret
    }
  }
}

export function installationComplete(runtime: Runtime): boolean {
  try {
    accessSync(runtime.paths.bin, constants.X_OK)
  } catch {
    try {
      accessSync(runtime.paths.legacyBin, constants.X_OK)
    } catch {
      return false
    }
  }
  return existsSync(runtime.paths.envFile) && existsSync(runtime.paths.unitFile)
}

export function dotenvTemplate(mode: 'install' | 'configure'): string {
  if (mode === 'install') {
    return [
      'HOST=',
      'AUTH_PASSWORD=',
      'AUTH_SECRET=',
      'AUTH_BEARER=',
      'AI_TYPE=anthropic',
      'AI_BASE_URL=https://api.anthropic.com',
      'AI_API_KEY=',
      'CM_RCS_PRODUCT_TOKEN=',
      'CM_RCS_FROM=',
      'CM_RCS_WEBHOOK_SECRET=',
      'CM_EMAIL_PRODUCT_TOKEN=',
      'CM_EMAIL_WEBHOOK_SECRET='
    ].join('\n')
  }
  return [
    'HOST=<valeur actuelle>',
    'AUTH_PASSWORD=<valeur actuelle>',
    'AUTH_SECRET=<valeur actuelle>',
    'AUTH_BEARER=<valeur actuelle>',
    'AI_TYPE=<valeur actuelle>',
    'AI_BASE_URL=<valeur actuelle>',
    'AI_API_KEY=<valeur actuelle>',
    'CM_RCS_PRODUCT_TOKEN=<valeur actuelle ou vide>',
    'CM_RCS_FROM=<valeur actuelle ou vide>',
    'CM_RCS_WEBHOOK_SECRET=<valeur actuelle ou vide>',
    'CM_EMAIL_PRODUCT_TOKEN=<valeur actuelle ou vide>',
    'CM_EMAIL_WEBHOOK_SECRET=<valeur actuelle ou vide>'
  ].join('\n')
}
