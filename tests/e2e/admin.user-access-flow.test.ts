import { beforeAll, expect, it } from 'bun:test'
import puppeteer from 'puppeteer'
import { delete_all_users, save_user } from '../../utils/handle-user'

// Initial setup
beforeAll(async () => {
  Bun.env.SERVICE = 'pierre-production'
  await delete_all_users()

  await save_user({
    email: 'collaborator@pierre-ia.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('de17a9bb-1cd0-440b-98cb-5be2fda3e5e2'),
    config: JSON.stringify(['default', 'demo_team'])
  })

  await save_user({
    email: 'contributor@pierre-ia.org',
    role: 'contributor',
    password_hash: await Bun.password.hash('de17a9bb-1cd0-440b-98cb-5be2fda3e5e2'),
    config: JSON.stringify(['default', 'demo_team'])
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
  const browser = await puppeteer.launch({ slowMo: 10 })
  await browser.deleteCookie()
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1024 })

  await page.goto('http://localhost:3000/a')
  expect(page.url()).toBe('http://localhost:3000/a/login')
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'oXVOtYqxODmD')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe(
    'http://localhost:3000/a/login?message=wrong_root_password&redirection=%2Fa'
  )
  let cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()

  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/conversations"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/conversations')

  await Promise.all([page.click('a[href="/a"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/statistics"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/statistics')

  await Promise.all([page.click('a[href="/a"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/users"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/users')

  await Promise.all([page.click('a[href="/a"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/knowledge"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/knowledge')

  await Promise.all([page.click('a[href="/a"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('button[value="logout"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')
  cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()

  await browser.close()
})

//
//
//
//
//
//
// Test contributor@pierre-ia.org
it('should validate contributor access flow', async () => {
  const browser = await puppeteer.launch({ slowMo: 10 }) // TODO: this test fails if there is no slowMo: why?
  await browser.deleteCookie()
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1024 })

  await page.goto('http://localhost:3000/a')
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await page.type('input[type="email"]', 'contributor@pierre-ia.org')
  await page.type('input[type="password"]', 'de17a9bb-1cd0-440b-98cb-5be2fda3e5e2')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')
  const cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  await Promise.all([page.click('a[href="a/conversations"]'), page.waitForNavigation()])
  await Bun.sleep(1000)
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/statistics"]'), page.waitForNavigation()])
  await Bun.sleep(1000)
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/users"]'), page.waitForNavigation()])
  await Bun.sleep(1000)
  expect(page.url()).toBe('http://localhost:3000/a')

  await Promise.all([page.click('a[href="a/knowledge"]'), page.waitForNavigation()])
  await Bun.sleep(1000)
  expect(page.url()).toBe('http://localhost:3000/a/knowledge')

  await browser.close()
})

//
//
//
//
//
//
// Test collaborator@pierre-ia.org
it('should validate collaborator access flow', async () => {
  const browser = await puppeteer.launch()
  await browser.deleteCookie()
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1024 })

  await page.goto('http://localhost:3000/a')
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await page.type('input[type="email"]', 'collaborator@pierre-ia.org')
  await page.type('input[type="password"]', 'not-the-correct-password')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login?message=wrong_password&redirection=%2Fa')

  await page.type('input[type="email"]', 'collaborator@pierre-ia.org')
  await page.type('input[type="password"]', 'de17a9bb-1cd0-440b-98cb-5be2fda3e5e2')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')
  const cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  await Promise.all([page.goto('http://localhost:3000/a/conversations'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await Promise.all([page.goto('http://localhost:3000/a/statistics'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await Promise.all([page.goto('http://localhost:3000/a/users'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await Promise.all([page.goto('http://localhost:3000/a/knowledge'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await browser.close()
})

//
//
//
//
//
//
// Test an unknown user
it('should validate unknown user access flow', async () => {
  const browser = await puppeteer.launch()
  await browser.deleteCookie()
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1024 })

  await page.goto('http://localhost:3000/a')
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await page.type('input[type="email"]', 'unknown@pierre-ia.org')
  await page.type('input[type="password"]', 'oXVOtYqxODmD')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login?message=unknown_user&redirection=%2Fa')

  await browser.close()
})
