import { describe, expect, test } from 'bun:test'

import {
  connectionFieldInvalid,
  loginErrorKind,
  loginErrorLabel,
  loginFieldErrorsFromCode,
  LOGIN_INVALID_URL_LABEL,
  LOGIN_REQUIRED_LABEL,
  validateLoginFields
} from '@/shared/lib/login-errors'

describe('validateLoginFields', () => {
  test('flags each empty field', () => {
    expect(validateLoginFields({ url: '', email: '', password: '' })).toEqual({
      url: LOGIN_REQUIRED_LABEL,
      email: LOGIN_REQUIRED_LABEL,
      password: LOGIN_REQUIRED_LABEL
    })
  })

  test('flags an invalid URL without touching filled credentials', () => {
    expect(
      validateLoginFields({
        url: 'not-a-url',
        email: 'a@b.fr',
        password: 'secret'
      })
    ).toEqual({ url: LOGIN_INVALID_URL_LABEL })
  })
})

describe('loginFieldErrorsFromCode', () => {
  test('places unknown_user on email', () => {
    expect(loginFieldErrorsFromCode('unknown_user')).toEqual({
      email: loginErrorLabel('unknown_user')
    })
  })

  test('places password codes on password', () => {
    expect(loginFieldErrorsFromCode('wrong_password')).toEqual({
      password: loginErrorLabel('wrong_password')
    })
    expect(loginFieldErrorsFromCode('wrong_root_password')).toEqual({
      password: loginErrorLabel('wrong_root_password')
    })
  })

  test('places network and server codes on url', () => {
    expect(loginFieldErrorsFromCode('network_error')).toEqual({
      url: loginErrorLabel('network_error')
    })
    expect(connectionFieldInvalid('url', loginFieldErrorsFromCode('server_error'))).toBe(true)
    expect(connectionFieldInvalid('email', loginFieldErrorsFromCode('server_error'))).toBe(false)
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
    expect(loginErrorLabel('unknown_user')).toContain('Utilisateur inconnu')
    expect(loginErrorLabel('wrong_root_password')).toContain('Mot de passe incorrect')
    expect(loginErrorLabel('network_error')).toContain('Impossible de joindre')
    expect(loginErrorLabel('invalid_response')).toContain('Impossible de joindre')
    expect(loginErrorLabel('session_cookie_missing')).toContain('cookie de session')
    expect(loginErrorLabel('api_unavailable')).toContain('Impossible de joindre')
    expect(loginErrorLabel('some_unknown_code')).toContain('some_unknown_code')
    expect(loginErrorLabel()).toContain('Identifiant ou mot de passe')
  })
})

const base = process.env.PIERRE_TEST_URL ?? 'http://localhost:3000'
const adminPassword = process.env.AUTH_PASSWORD

const serverUp = await fetch(`${base}/up`)
  .then((r) => r.ok)
  .catch(() => false)

describe('POST /a/login JSON @ localhost', () => {
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

  test.skipIf(!serverUp)('wrong password → 401 ok false', async () => {
    const { res, body } = await jsonLogin('admin@pierre-ia.org', 'wrong-password')
    expect(res.status).toBe(401)
    expect(body.ok).toBe(false)
    expect(body.message).toBe('wrong_root_password')
  })

  test.skipIf(!serverUp || !adminPassword)(
    'valid admin → 200 ok true + cookie usable on /ai/boot',
    async () => {
      const { res, body } = await jsonLogin('admin@pierre-ia.org', adminPassword!)
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
    }
  )
})
