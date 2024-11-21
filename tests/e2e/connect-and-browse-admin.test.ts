import { Database } from 'bun:sqlite'
import { beforeAll, expect, it } from 'bun:test'
import puppeteer from 'puppeteer'
import { db } from '../../utils/database'

//
//
// Delete all users
beforeAll(() => {
  const database = db('datastore')
  if (database instanceof Database) database.query('DELETE FROM users').run()
})

//
//
//
it('`admin` should pass e2e test', async () => {
  //
  //
  //
  // Go to `/a` without being logged
  const browser = await puppeteer.launch({ slowMo: 10 }) // headless: false
  const page = await browser.newPage()
  // Set timeout to 60 seconds to run this long e2e test
  page.setDefaultNavigationTimeout(60000)
  await page.goto('http://localhost:3000/a')
  await page.setViewport({ width: 1080, height: 1024 })

  expect(page.url()).toBe('http://localhost:3000/a/login')

  //
  //
  //
  //
  //
  //
  // Test all `admin` using `admin@pierre-ia`
  //
  //
  //

  //Type a wrong admin root password
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'oXVOtYqxODmD')
  await page.click('input[type="submit"]')
  await Bun.sleep(250)
  expect(page.url()).toBe(
    'http://localhost:3000/a/login?message=wrong_root_password&redirection=%2Fa'
  )

  // Type a correct admin root password
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection

  // Cookie must be set and page be `/a`
  let cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to `encyclopedia`
  await page.click('a[href="a/encyclopedia"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/encyclopedia')

  // Return to hompage
  await page.click('a[href="/a"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to `conversations`
  await page.click('a[href="a/conversations"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/conversations')

  // Return to hompage
  await page.click('a[href="/a"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to `statistics`
  await page.click('a[href="a/statistics"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/statistics')

  // Return to hompage
  await page.click('a[href="/a"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to `users`
  await page.click('a[href="a/users"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/users')

  // Add multiple users
  await page.type('input[type="email"]', 'another_administrator@pierre-ia.org')
  await page.type('input[type="text"]', 'oXVOtYqxODmD')
  await page.select('select[name="role"]', 'administrator')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/users')

  await page.type('input[type="email"]', 'contributor@pierre-ia.org')
  await page.type('input[type="text"]', 'oXVOtYqxODmD')
  await page.select('select[name="role"]', 'contributor')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/users')

  await page.type('input[type="email"]', 'collaborator@pierre-ia.org')
  await page.type('input[type="text"]', 'oXVOtYqxODmD')
  await page.select('select[name="role"]', 'collaborator')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/users')

  await page.type('input[type="email"]', 'delete@pierre-ia.org')
  await page.type('input[type="text"]', 'oXVOtYqxODmD')
  await page.select('select[name="role"]', 'collaborator')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/users')

  // Check if user number is 5
  let rows = await page.$$eval('table tr', (rows) => rows.length)
  expect(rows).toBe(5)

  // Delete a user
  await page.click('button[value="delete@pierre-ia.org"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/users')

  // Check if user number is 4
  rows = await page.$$eval('table tr', (rows) => rows.length)
  expect(rows).toBe(4)

  // Return to homepage and logout
  await page.click('a[href="/a"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  await page.click('button[value="logout"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Cookie must be undefined
  cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()

  //
  //
  //
  //
  //
  //
  // Test an unknown user
  //
  //
  //

  // Type an unknown email user
  await page.type('input[type="email"]', 'unknown@pierre-ia.org')
  await page.type('input[type="password"]', 'oXVOtYqxODmD')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/login?message=unknown_user&redirection=%2Fa')

  //
  //
  //
  //
  //
  //
  // Test collaborator@pierre-ia.org (created earlier/above)
  //
  //
  //

  // Type an incorrect password
  await page.type('input[type="email"]', 'collaborator@pierre-ia.org')
  await page.type('input[type="password"]', 'not-the-correct-password')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/login?message=wrong_password&redirection=%2Fa')

  // Type the correct password
  await page.type('input[type="email"]', 'collaborator@pierre-ia.org')
  await page.type('input[type="password"]', 'oXVOtYqxODmD')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Cookie must be set
  cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  // Navigate to forbidden links
  await page.goto('http://localhost:3000/a/encyclopedia')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await page.goto('http://localhost:3000/a/conversations')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await page.goto('http://localhost:3000/a/statistics')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/login')

  await page.goto('http://localhost:3000/a/users')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Delete created cookie to continue e2e test
  await page.deleteCookie({ name: 'pierre-ia' })
  expect(cookie).toBeDefined()

  //
  //
  //
  //
  //
  //
  // Test contributor@pierre-ia.org (created earlier/above)
  //
  //
  //

  // Type the correct password
  await page.type('input[type="email"]', 'contributor@pierre-ia.org')
  await page.type('input[type="password"]', 'oXVOtYqxODmD')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a')

  // Cookie must be set
  cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  // Navigate to an authorized page
  await page.click('a[href="a/encyclopedia"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/encyclopedia')

  // Return to homepage
  await page.click('a[href="/a"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to multiple forbidden links
  await page.click('a[href="a/conversations"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a')

  await page.click('a[href="a/statistics"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a')

  await page.click('a[href="a/users"]')
  await Bun.sleep(250) // Wait for redirection
  expect(page.url()).toBe('http://localhost:3000/a')

  //
  //
  //
  // e2e test is done!
  await browser.close()
})
