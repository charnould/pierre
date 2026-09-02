import { expect, it } from 'bun:test'

import { delete_all_users, save_user } from '../../utils/handle-user'
import { launchE2EBrowser } from './launch-browser'

it('should display the correct config options for anonymous and authenticated users', async () => {
  // Initial setup
  Bun.env['SERVICE'] = 'pierre-production'
  await delete_all_users()

  await save_user({
    email: 'test@test.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('a-complicated-password'),
    config: JSON.stringify(['demo', 'testing_purpose_1', 'testing_purpose_2', 'non_existing'])
  })

  const browser = await launchE2EBrowser()
  await browser.deleteCookie()
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)

  // Case 1
  // Visit chatbot page as an anonymous user
  await page.goto('http://localhost:3000/c')
  const cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')
  expect(cookie).toBeUndefined()

  // Case 2
  // Visit an alternative non protected config as an anonymous user
  await page.goto('http://localhost:3000/?config=testing_purpose_2')
  expect(page.url()).toBe('http://localhost:3000/c?config=testing_purpose_2&data=')
  await page.waitForSelector('a[data-config]')

  let configs = await page.$$eval('a[data-config]', (anchors) => {
    return anchors.map((a) => a.href)
  })

  expect(configs).toEqual([
    'http://localhost:3000/?config=demo',
    'http://localhost:3000/?config=default',
    'http://localhost:3000/?config=testing_purpose_1',
    'http://localhost:3000/?config=testing_purpose_2'
  ])

  // Case 3
  // Visit a protected config and log in
  await page.goto('http://localhost:3000/?config=testing_purpose_1')
  expect(page.url()).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  await page.type('input[type="email"]', 'test@test.org')
  await page.type('input[type="password"]', 'a-complicated-password')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')

  await page.waitForSelector('a[data-config]')

  configs = await page.$$eval('a[data-config]', (anchors) => {
    return anchors.map((a) => a.href)
  })

  expect(configs).toEqual([
    'http://localhost:3000/?config=demo',
    'http://localhost:3000/?config=testing_purpose_1',
    'http://localhost:3000/?config=testing_purpose_2'
  ])

  await browser.close()
})
