import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'

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

export type MergeResult = { ok: true; env: ParsedEnv } | { ok: false; error: string }

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

export function isConfigured(runtime: Runtime): boolean {
  return requiredReady(readEnvMap(runtime.paths.envFile))
}

export function parseHostArgs(
  argv: string[]
): { ok: true; flags: ConfigureFlags } | { ok: false; error: string } {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { ok: false, error: '' }
  }
  let host: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? ''
    if (token.includes('=')) return { ok: false, error: `Écrivez ${token.split('=')[0]} VALEUR.` }
    if (token !== '--host') return { ok: false, error: `Option inconnue : ${token}` }
    if (host !== undefined) return { ok: false, error: 'Option dupliquée : --host' }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--') || value.length === 0) {
      return { ok: false, error: '--host attend une valeur.' }
    }
    host = value
    index += 1
  }
  return { ok: true, flags: { host } }
}

export function mergeConfiguration(current: EnvMap, flags: ConfigureFlags): MergeResult {
  const host = cleanHost(flags.host ?? current.HOST ?? '')
  if (!host) return { ok: false, error: 'Le premier paramétrage exige --host.' }
  if (/\s/.test(host)) return { ok: false, error: 'Le domaine est invalide.' }
  const password = current.AUTH_PASSWORD || readablePassword()
  if (password.length < 8 || password.length > 128) {
    return { ok: false, error: 'AUTH_PASSWORD doit contenir entre 8 et 128 caractères.' }
  }
  const authSecret = current.AUTH_SECRET || randomBytes(32).toString('hex')
  const authBearer = current.AUTH_BEARER || randomBytes(32).toString('hex')
  if (authSecret.length < 32) {
    return { ok: false, error: 'AUTH_SECRET doit contenir au moins 32 caractères.' }
  }
  if (!authBearer) return { ok: false, error: 'AUTH_BEARER est obligatoire.' }
  return { ok: true, env: { host, password, authSecret, authBearer } }
}

const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

function readablePassword(): string {
  const chars = [...randomBytes(16)].map((byte) => PASSWORD_ALPHABET[byte % 32] ?? 'a')
  return [0, 4, 8, 12].map((start) => chars.slice(start, start + 4).join('')).join('-')
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
