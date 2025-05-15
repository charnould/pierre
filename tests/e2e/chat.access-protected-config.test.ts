import { expect, it } from 'bun:test'
import puppeteer from 'puppeteer'

it('should grant access to protected config for logged user', async () => {
  Bun.env.SERVICE = 'pierre-production'
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/?config=testing_purpose_1')
  await page.setViewport({ width: 1080, height: 1024 })

  expect(page.url()).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])

  const cookie = (await browser.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  expect(page.url()).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')

  await browser.close()
})
