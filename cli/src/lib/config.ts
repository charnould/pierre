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

export const ENV_KEYS = ['HOST', 'AUTH_PASSWORD', 'AUTH_SECRET', 'AUTH_BEARER'] as const

export type EnvKey = (typeof ENV_KEYS)[number]
export type EnvMap = Partial<Record<EnvKey, string>>

export type ParsedEnv = {
  host: string
  password: string
  authSecret: string
  authBearer: string
}

export type ConfigureFlags = {
  host?: string
}

export type MergeResult =
  | { ok: true; env: ParsedEnv; passwordGenerated: boolean }
  | { ok: false; error: string }

const FLAG_NAMES = { host: 'host' } as const

type FlagName = keyof typeof FLAG_NAMES

export const INSTALL_USAGE = ['Usage :', '  pierre install --host assistant.exemple.org', ''].join(
  '\n'
)

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
    ''
  ].join('\n')
}

export function writePrivate(file: string, content: string) {
  const temporary = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  writeFileSync(temporary, content, { mode: 0o600 })
  chmodSync(temporary, 0o600)
  renameSync(temporary, file)
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

export function parseHostArgs(
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
  if (first && !flags.host) {
    return { ok: false, error: 'Le premier paramétrage exige --host.' }
  }
  const host = cleanHost(flags.host ?? current.HOST ?? '')
  if (!host || /\s/.test(host)) return { ok: false, error: 'Le domaine est invalide.' }
  const password = current.AUTH_PASSWORD || randomBytes(32).toString('hex')
  if (password.length < 8 || password.length > 128) {
    return { ok: false, error: 'AUTH_PASSWORD doit contenir entre 8 et 128 caractères.' }
  }
  const authSecret = current.AUTH_SECRET || randomBytes(32).toString('hex')
  const authBearer = current.AUTH_BEARER || randomBytes(32).toString('hex')
  if (authSecret.length < 32) {
    return { ok: false, error: 'AUTH_SECRET doit contenir au moins 32 caractères.' }
  }
  if (!authBearer) return { ok: false, error: 'AUTH_BEARER est obligatoire.' }
  return {
    ok: true,
    passwordGenerated: !current.AUTH_PASSWORD,
    env: { host, password, authSecret, authBearer }
  }
}

function requiredReady(map: EnvMap): boolean {
  const password = map.AUTH_PASSWORD ?? ''
  return Boolean(
    cleanHost(map.HOST ?? '') &&
    password.length >= 8 &&
    password.length <= 128 &&
    (map.AUTH_SECRET ?? '').length >= 32 &&
    map.AUTH_BEARER
  )
}

function isFlagName(value: string): value is FlagName {
  return Object.hasOwn(FLAG_NAMES, value)
}
