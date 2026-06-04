import { beforeAll, expect, it } from 'bun:test'

import { User } from '../../../../../utils/_schema'
import { delete_all_users, save_user } from '../../../../../utils/handle-user'

const BASE = 'http://localhost:3000'
const DESKTOP_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'X-Pierre-Client': 'desktop'
}

async function serverUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/up`)
    return res.ok
  } catch {
    return false
  }
}

function pierreCookie(res: Response): string | null {
  const lines = res.headers.getSetCookie?.() ?? []
  const raw = res.headers.get('set-cookie')
  const all = raw && lines.length === 0 ? [raw] : lines
  const pierre = all.find((c) => c.startsWith('pierre-ia='))
  return pierre ? pierre.split(';')[0] : null
}

beforeAll(async () => {
  if (!(await serverUp())) return
  Bun.env['SERVICE'] = 'pierre-production'
  Bun.env['AUTH_PASSWORD'] ??= 'harry121284'
  await delete_all_users()

  await save_user(
    User.parse({
      email: 'json-login@pierre-ia.org',
      role: 'collaborator',
      config: JSON.stringify(['default', 'demo']),
      password_hash: await Bun.password.hash('json-login-pw')
    })
  )
})

it('JSON login: wrong password → 401, no cookie', async () => {
  if (!(await serverUp())) return

  const res = await fetch(`${BASE}/a/login?client=desktop`, {
    method: 'POST',
    headers: DESKTOP_HEADERS,
    body: new URLSearchParams({
      email: 'json-login@pierre-ia.org',
      password: 'wrong',
      action: 'login'
    })
  })

  expect(res.status).toBe(401)
  const body = (await res.json()) as { ok: boolean; message?: string }
  expect(body.ok).toBe(false)
  expect(body.message).toBe('wrong_password')
  expect(pierreCookie(res)).toBeNull()
})

it('JSON login: valid credentials → 200, Set-Cookie', async () => {
  if (!(await serverUp())) return

  const adminPassword = Bun.env['AUTH_PASSWORD'] ?? 'harry121284'
  const res = await fetch(`${BASE}/a/login?client=desktop`, {
    method: 'POST',
    headers: DESKTOP_HEADERS,
    body: new URLSearchParams({
      email: 'admin@pierre-ia.org',
      password: adminPassword,
      action: 'login'
    })
  })

  expect(res.status).toBe(200)
  const body = (await res.json()) as { ok: boolean }
  expect(body.ok).toBe(true)
  expect(pierreCookie(res)).toMatch(/^pierre-ia=/)
})

it('JSON logout → 200 ok', async () => {
  if (!(await serverUp())) return

  const adminPassword = Bun.env['AUTH_PASSWORD'] ?? 'harry121284'
  const loginRes = await fetch(`${BASE}/a/login?client=desktop`, {
    method: 'POST',
    headers: DESKTOP_HEADERS,
    body: new URLSearchParams({
      email: 'admin@pierre-ia.org',
      password: adminPassword,
      action: 'login'
    })
  })
  const cookie = pierreCookie(loginRes)

  const res = await fetch(`${BASE}/a/login?client=desktop`, {
    method: 'POST',
    headers: { ...DESKTOP_HEADERS, Cookie: cookie ?? '' },
    body: new URLSearchParams({ action: 'logout' })
  })

  expect(res.status).toBe(200)
  expect((await res.json()) as { ok: boolean }).toEqual({ ok: true })
})

it('form login: wrong password still redirects (web regression)', async () => {
  if (!(await serverUp())) return

  const res = await fetch(`${BASE}/a/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: 'json-login@pierre-ia.org',
      password: 'wrong',
      action: 'login'
    }),
    redirect: 'manual'
  })

  expect(res.status).toBeGreaterThanOrEqual(300)
  expect(res.status).toBeLessThan(400)
  expect(res.headers.get('location')).toContain('message=wrong_password')
})
