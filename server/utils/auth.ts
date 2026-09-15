import { Database } from 'bun:sqlite'

import { betterAuth } from 'better-auth'

import { datastorePaths } from './paths'

const THIRTY_DAYS = 60 * 60 * 24 * 30
const ONE_DAY = 60 * 60 * 24

function serverBaseUrl(): string {
  if (Bun.env['NODE_ENV'] !== 'production') {
    return `http://localhost:${Bun.env['BUN_PORT'] ?? '3000'}`
  }
  const host = Bun.env['HOST']?.trim()
  if (!host) throw new Error('HOST is required in production')
  return host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`
}

function authSecret(): string {
  const secret = Bun.env['AUTH_SECRET']
  if (!secret || secret.length < 32)
    throw new Error('AUTH_SECRET must contain at least 32 characters')
  return secret
}

const PASSWORD_HASH = {
  algorithm: 'argon2id',
  memoryCost: 65536,
  timeCost: 2
} as const

export const hashPassword = (password: string) => Bun.password.hash(password, PASSWORD_HASH)

export const verifyPassword = (password: string, hash: string) =>
  Bun.password.verify(password, hash)

function createAuth(databasePath: string) {
  const baseURL = serverBaseUrl()
  const isProduction = Bun.env['NODE_ENV'] === 'production'
  return betterAuth({
    appName: 'PIERRE',
    basePath: '/auth',
    baseURL,
    database: new Database(databasePath),
    secret: authSecret(),
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(password, hash)
      }
    },
    ...(isProduction ? { rateLimit: { enabled: true, storage: 'memory' } } : {}),
    session: {
      expiresIn: THIRTY_DAYS,
      updateAge: ONE_DAY
    },
    user: {
      modelName: 'users'
    },
    advanced: {
      cookiePrefix: 'pierre',
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: baseURL.startsWith('https://')
      },
      ...(isProduction ? { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } } : {})
    }
  })
}

export type PierreAuth = ReturnType<typeof createAuth>

let current: { databasePath: string; auth: PierreAuth } | null = null

export function getAuth(): PierreAuth {
  const databasePath = datastorePaths().database
  if (current?.databasePath !== databasePath) {
    current = { databasePath, auth: createAuth(databasePath) }
  }
  return current.auth
}
