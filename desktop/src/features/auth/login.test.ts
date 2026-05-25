import { describe, expect, test } from 'bun:test'

import { connectionFieldInvalid, loginErrorKind, loginErrorLabel } from '@/shared/lib/login-errors'

describe('connectionFieldInvalid', () => {
  test('marks only password for auth errors', () => {
    expect(connectionFieldInvalid('url', 'x', 'auth')).toBe(false)
    expect(connectionFieldInvalid('password', 'x', 'auth')).toBe(true)
  })

  test('marks url only for URL validation errors', () => {
    expect(connectionFieldInvalid('url', 'URL invalide. Exemple', 'validation')).toBe(true)
    expect(connectionFieldInvalid('email', 'URL invalide. Exemple', 'validation')).toBe(false)
  })

  test('does not mark fields for server errors', () => {
    expect(connectionFieldInvalid('url', 'x', 'server')).toBe(false)
    expect(connectionFieldInvalid('password', 'x', 'server')).toBe(false)
  })
})

describe('loginErrorKind', () => {
  test('classifies credential vs server errors', () => {
    expect(loginErrorKind('wrong_password')).toBe('auth')
    expect(loginErrorKind('network_error')).toBe('server')
  })
})

describe('loginErrorLabel', () => {
  test('maps server messages to French labels', () => {
    expect(loginErrorLabel('wrong_password')).toContain('Mot de passe incorrect')
    expect(loginErrorLabel('unknown_user')).toContain('Email inconnu')
    expect(loginErrorLabel('wrong_root_password')).toContain('AUTH_PASSWORD')
    expect(loginErrorLabel('network_error')).toContain('Pierre tourne')
    expect(loginErrorLabel('invalid_response')).toContain('Réponse serveur')
    expect(loginErrorLabel('session_cookie_missing')).toContain('cookie de session')
    expect(loginErrorLabel('api_unavailable')).toContain('Electron')
    expect(loginErrorLabel('some_unknown_code')).toContain('some_unknown_code')
    expect(loginErrorLabel()).toContain('Identifiant ou mot de passe')
  })
})

describe('POST /a/login JSON @ localhost', () => {
  const base = process.env.PIERRE_TEST_URL ?? 'http://localhost:3000'
  const adminPassword = process.env.AUTH_PASSWORD ?? 'harry121284'

  async function jsonLogin(email: string, password: string) {
    const res = await fetch(`${base}/a/login?client=desktop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-Pierre-Client': 'desktop'
      },
      body: new URLSearchParams({ email, password, action: 'login' })
    })
    return { res, body: (await res.json()) as { ok: boolean; message?: string } }
  }

  test('wrong password → 401 ok false', async () => {
    const up = await fetch(`${base}/up`).catch(() => null)
    if (!up?.ok) return

    const { res, body } = await jsonLogin('admin@pierre-ia.org', 'wrong-password')
    expect(res.status).toBe(401)
    expect(body.ok).toBe(false)
    expect(body.message).toBe('wrong_root_password')
  })

  test('valid admin → 200 ok true + cookie usable on /ai/boot', async () => {
    const up = await fetch(`${base}/up`).catch(() => null)
    if (!up?.ok) return

    const { res, body } = await jsonLogin('admin@pierre-ia.org', adminPassword)
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    const setCookie = res.headers.getSetCookie?.() ?? []
    const raw = res.headers.get('set-cookie')
    const line = setCookie.find((c) => c.startsWith('pierre-ia=')) ?? raw
    expect(line).toBeTruthy()

    const pair = line!.startsWith('pierre-ia=') ? line!.split(';')[0] : `pierre-ia=${line}`
    const boot = await fetch(`${base}/ai/boot`, { headers: { Cookie: pair } })
    expect(boot.ok).toBe(true)
    const data = (await boot.json()) as { displayableConfigs: { id: string }[] }
    const ids = data.displayableConfigs.map((c) => c.id)
    expect(ids.length).toBeGreaterThan(3)
  })
})
