import { expect, it } from 'bun:test'
import puppeteer, { type ElementHandle } from 'puppeteer'
import { db } from '../../utils/database'

it('should upload user file successfully', async () => {
  Bun.env.SERVICE = 'pierre-production'
  db('datastore').query('DELETE FROM users').run()
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1024 })

  // Login and navigate to `knowledge`
  await page.goto('http://localhost:3000/a/login')
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')
  await Promise.all([page.click('a[href="a/users"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/users')

  // Upload `user_1.xlsx` file
  let input = (await page.$('input[type="file"]')) as ElementHandle<HTMLInputElement>
  await input.uploadFile('tests/e2e/mock-files/users_1.xlsx')
  await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Login and navigate to `knowledge`
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')
  await Promise.all([page.click('a[href="a/users"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/users')

  // Check if user count is correct
  let li = await page.$$eval('li', (b) => b.length)
  expect(li).toBe(5)

  // Upload `user_2.xlsx` file
  input = (await page.$('input[type="file"]')) as ElementHandle<HTMLInputElement>
  await input.uploadFile('tests/e2e/mock-files/users_2.xlsx')
  await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Login and navigate to `knowledge`
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')
  await Promise.all([page.click('a[href="a/users"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/users')

  // Check if user count is correct
  li = await page.$$eval('li', (b) => b.length)
  expect(li).toBe(2)

  await browser.close()
})
