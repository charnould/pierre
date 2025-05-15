import { expect, it } from 'bun:test'
import puppeteer from 'puppeteer'

it('should redirect to the default config for invalid paths and parameters + preserve valid config/data pairs', async () => {
  const browser = await puppeteer.launch()
  await browser.deleteCookie()
  const page = await browser.newPage()

  // Accessing base `/c` route with no parameters or completely invalid
  // paths should redirect to default config with empty data
  await page.goto('http://localhost:3000/c')
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')

  await page.goto('http://localhost:3000/wrong_path')
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')

  await page.goto('http://localhost:3000/c/wrong_path')
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')

  const path = 'http://localhost:3000/c'

  // Using invalid or missing config/context query
  // parameters should fallback to default config
  await page.goto(`${path}?config=wrong_config`)
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')

  await page.goto(`${path}?config=wrong_config&context=wrong_context`)
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')

  // Providing a valid config but missing data should
  // still resolve properly, adding an empty data param

  await page.goto(`${path}?config=default`)
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=')

  // Missing config but valid data should fallback
  // to default config while preserving data

  await page.goto(`${path}?data=test`)
  expect(page.url()).toBe('http://localhost:3000/c?config=default&data=test')

  // Valid config and data pair
  // should be preserved as-is
  await page.goto(`${path}?config=demo_team&data=test`)
  expect(page.url()).toBe('http://localhost:3000/c?config=demo_team&data=test')

  await browser.close()
})
