import { beforeAll, expect, it } from 'bun:test'

import { delete_all_users, save_user } from '../../utils/handle-user'
import {
  clickAndWait,
  createE2EView,
  currentUrl,
  fillInput,
  getCookies,
  navigate
} from './launch-browser'

// Initial setup
beforeAll(async () => {
  Bun.env['SERVICE'] = 'pierre-production'
  await delete_all_users()

  await save_user({
    email: 'collaborator@pierre-ia.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('de17a9bb-1cd0-440b-98cb-5be2fda3e5e2'),
    config: JSON.stringify(['default', 'demo'])
  })

  await save_user({
    email: 'contributor@pierre-ia.org',
    role: 'contributor',
    password_hash: await Bun.password.hash('de17a9bb-1cd0-440b-98cb-5be2fda3e5e2'),
    config: JSON.stringify(['default', 'demo'])
  })
})

//
//
//
//
//
//
// Test `admin@pierre-ia`
it('should validate administrator access flow', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/a')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')
  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', 'oXVOtYqxODmD')
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/a/login?message=wrong_root_password&redirection=%2Fa'
  })
  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/a/login?message=wrong_root_password&redirection=%2Fa'
  )
  let cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()

  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', Bun.env['AUTH_PASSWORD']!)
  await clickAndWait(view, 'input[type="submit"]', { url: 'http://localhost:3000/a' })
  cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/conversations"]', {
    url: 'http://localhost:3000/a/conversations'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/conversations')

  await clickAndWait(view, 'a[href="/a"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/statistics"]', {
    url: 'http://localhost:3000/a/statistics'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/statistics')

  await clickAndWait(view, 'a[href="/a"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/users"]', {
    url: 'http://localhost:3000/a/users'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/users')

  await clickAndWait(view, 'a[href="/a"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/knowledge"]', {
    url: 'http://localhost:3000/a/knowledge'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/knowledge')

  await clickAndWait(view, 'a[href="/a"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'button[value="logout"]', {
    url: 'http://localhost:3000/a/login'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')
  cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()
}, 20000)

//
//
//
//
//
//
// Test contributor@pierre-ia.org
it('should validate contributor access flow', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/a')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  await fillInput(view, 'input[type="email"]', 'contributor@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', 'de17a9bb-1cd0-440b-98cb-5be2fda3e5e2')
  await clickAndWait(view, 'input[type="submit"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')
  const cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  await clickAndWait(view, 'a[href="a/conversations"]', {
    url: 'http://localhost:3000/a'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/statistics"]', {
    url: 'http://localhost:3000/a'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/users"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  await clickAndWait(view, 'a[href="a/knowledge"]', {
    url: 'http://localhost:3000/a/knowledge'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/knowledge')
}, 20000)

//
//
//
//
//
//
// Test collaborator@pierre-ia.org
it('should validate collaborator access flow', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/a')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  await fillInput(view, 'input[type="email"]', 'collaborator@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', 'not-the-correct-password')
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/a/login?message=wrong_password&redirection=%2Fa'
  })
  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/a/login?message=wrong_password&redirection=%2Fa'
  )

  await fillInput(view, 'input[type="email"]', 'collaborator@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', 'de17a9bb-1cd0-440b-98cb-5be2fda3e5e2')
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/c?config=default&data='
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')
  const cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  await navigate(view, 'http://localhost:3000/a/conversations')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  await navigate(view, 'http://localhost:3000/a/statistics')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  await navigate(view, 'http://localhost:3000/a/users')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  await navigate(view, 'http://localhost:3000/a/knowledge')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')
}, 20000)

//
//
//
//
//
//
// Test an unknown user
it('should validate unknown user access flow', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/a')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  await fillInput(view, 'input[type="email"]', 'unknown@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', 'oXVOtYqxODmD')
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/a/login?message=unknown_user&redirection=%2Fa'
  })
  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/a/login?message=unknown_user&redirection=%2Fa'
  )
}, 20000)
