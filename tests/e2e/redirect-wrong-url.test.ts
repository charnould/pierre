import { expect, it } from 'bun:test'
import puppeteer from 'puppeteer'

it('should redirect `http://localhost:3000/c` correctly', async () => {
  const browser = await puppeteer.launch({ slowMo: 10 })
  await browser.deleteCookie()

  const page = await browser.newPage()
  const cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()

  const path = 'http://localhost:3000/c/'

  await page.goto(path)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/
  )

  await page.goto(`${path}/wrong_uuid`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/
  )

  await page.goto(`${path}/?config=wrong_config`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/
  )

  await page.goto(`${path}/?config=wrong_config&context=wrong_context`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/
  )

  await page.goto(`${path}/?config=pierre-ia.org&context=default`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/
  )

  await page.goto(`${path}/?config=pierre-ia.org&context=no_rag&data=test`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/a\/login\?redirection=c%2F%3Fconfig%3Dpierre-ia.org%26context%3Dno_rag%26data%3Dtest/
  )

  await page.goto(`${path}/?data=test`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default&data=test/
  )

  await page.goto(`${path}/?context=test`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/a\/login\?redirection=c%2F%3Fconfig%3Dpierre-ia.org%26context%3Dtest%26data%3/
  )

  await page.goto(`${path}/?context=test`)
  expect(page.url()).toMatch(
    /http:\/\/localhost:3000\/a\/login\?redirection=c%2F%3Fconfig%3Dpierre-ia.org%26context%3Dtest%26data%3/
  )

  // e2e test is done!
  await browser.close()
})

it('should redirect `http://localhost:3000/a` correctly', async () => {
  const browser = await puppeteer.launch({ slowMo: 10 })
  await browser.deleteCookie()

  const page = await browser.newPage()

  let cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeUndefined()

  const path = 'http://localhost:3000/a'

  await page.goto(`${path}`)
  expect(page.url()).toMatch(/http:\/\/localhost:3000\/a\/login/)

  // Log in
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await page.click('input[type="submit"]')
  await Bun.sleep(250) // Wait for redirection

  // Cookie must be set...
  cookie = (await page.cookies()).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  // ...and URL must be the one to the protected context
  expect(page.url()).toMatch(/http:\/\/localhost:3000\/a/)

  // e2e test is done!
  await browser.close()
})
