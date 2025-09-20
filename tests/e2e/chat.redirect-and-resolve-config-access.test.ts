import { beforeAll, expect, it } from 'bun:test'
import { SQL } from 'bun'
import puppeteer from 'puppeteer'
import { delete_all_users, save_user } from '../../utils/handle-user'

const _sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

beforeAll(async () => {
  Bun.env.SERVICE = 'pierre-production'
  await delete_all_users()
  await save_user({
    email: 'test@test.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('complicated-test-password'),
    config: JSON.stringify(['demo_team', 'testing_purpose_1', 'non_existing'])
  })
})

it('should redirect and resolve configuration access correctly for anonymous and authenticated users', async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)

  // Visit chatbot page as an anonymous user
  await page.goto('http://localhost:3000/c')
  let cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')
  expect(cookie).toBeUndefined()

  // Attempt to access a protected config without authentication
  await page.goto('http://localhost:3000/?config=testing_purpose_1')
  expect(page.url()).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  // Fill in login credentials and submit form
  await page.type('input[type="email"]', 'test@test.org')
  await page.type('input[type="password"]', 'complicated-test-password')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])

  // Verify redirection to the requested config after login
  expect(page.url()).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')
  cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  // Test fallback to default config when accessing an unknown config
  await page.goto('http://localhost:3000/c?config=non_existing&data=')
  expect(page.url()).toBe('http://localhost:3000/c?config=demo_team&data=')

  await page.goto('http://localhost:3000/c?config=hello_wordg&data=')
  expect(page.url()).toBe('http://localhost:3000/c?config=demo_team&data=')

  // Test user can access config he has access to
  await page.goto('http://localhost:3000/c?config=demo_teamg&data=')
  expect(page.url()).toBe('http://localhost:3000/c?config=demo_team&data=')

  await browser.close()
})
