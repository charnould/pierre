import { beforeAll, expect, it } from 'bun:test'

import server from '../../../../app.ts'
import { User } from '../../../../utils/_schema'
import { delete_all_users, save_user } from '../../../../utils/handle-user'

beforeAll(async () => {
  Bun.env['SERVICE'] = 'pierre-production'
  Bun.env['AUTH_SECRET'] ??= '0123456789abcdef0123456789abcdef'
  await delete_all_users()

  await save_user(
    User.parse({
      email: 'boot-test@pierre-ia.org',
      role: 'collaborator',
      config: JSON.stringify(['demo', 'testing_purpose_1', 'testing_purpose_2']),
      password_hash: await Bun.password.hash('boot-test-pw')
    })
  )
})

function cookieFromLoginResponse(res: Response): string {
  const setCookie = res.headers.getSetCookie?.() ?? []
  if (setCookie.length === 0) {
    const raw = res.headers.get('set-cookie')
    if (raw) setCookie.push(raw)
  }
  const pierre = setCookie.find((c) => c.startsWith('pierre-ia='))
  if (!pierre) {
    throw new Error(
      `Missing pierre-ia cookie from login (status ${res.status}, location ${res.headers.get('location')})`
    )
  }
  return pierre.split(';')[0]
}

it('GET /ai/boot lists profiles from users.config, not default.show only', async () => {
  const loginRes = await server.fetch(
    new Request('http://localhost/a/login?client=desktop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-Pierre-Client': 'desktop'
      },
      body: new URLSearchParams({
        email: 'boot-test@pierre-ia.org',
        password: 'boot-test-pw',
        action: 'login'
      }),
      redirect: 'manual'
    })
  )

  expect(loginRes.status).toBe(200)

  const cookie = cookieFromLoginResponse(loginRes)
  const bootRes = await server.fetch(
    new Request('http://localhost/ai/boot', {
      headers: { Cookie: cookie }
    })
  )

  expect(bootRes.ok).toBe(true)
  const boot = (await bootRes.json()) as {
    configId: string
    displayableConfigs: { id: string }[]
  }
  const ids = boot.displayableConfigs.map((c) => c.id).sort()

  expect(ids).toEqual(['demo', 'testing_purpose_1', 'testing_purpose_2'].sort())
  expect(ids).not.toContain('default')
  expect(ids).not.toContain('zmode')
  expect(boot.configId).toBe('demo')
})
