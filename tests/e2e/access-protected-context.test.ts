import { expect, it } from 'bun:test'
import puppeteer from 'puppeteer'

it('admin@pierre-ia.org should access `testing_purpose` context', async () => {
  //
  const browser = await puppeteer.launch({ slowMo: 10 })
  const page = await browser.newPage()

  // Try to accesss a protected context without being logged
  await page.goto('http://localhost:3000/?config=testing_purpose')
  await page.setViewport({ width: 1080, height: 1024 })

  expect(page.url()).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose%26data%3D'
  )

  // Log in
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection

  // Cookie must be set...
  const cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  // ...and URL must be the one to the protected context
  expect(page.url()).toMatch(/http:\/\/localhost:3000\/c\?config=testing_purpose&data=/)

  // e2e test is done!
  await browser.close()
})
