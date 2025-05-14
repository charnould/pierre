import { expect, it } from 'bun:test'
import { $ } from 'bun'
import puppeteer, { type ElementHandle } from 'puppeteer'

it('should upload knowledge files successfully', async () => {
  // Remove mock files from datastore
  Bun.env.SERVICE = 'pierre-production'
  await $`rm -rf ./datastores/${Bun.env.SERVICE}/files`
  await $`mkdir -p ./datastores/${Bun.env.SERVICE}/files/`

  //Go to `/a`
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/a')
  await page.setViewport({ width: 1080, height: 1024 })
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Login
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await Promise.all([page.click('input[type="submit"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to `knowledge`
  await Promise.all([page.click('a[href="a/knowledge"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a/knowledge')

  // Upload one file and check it is shown in UI
  let input = (await page.$('input[type="file"]')) as ElementHandle<HTMLInputElement>
  await input.uploadFile('tests/e2e/mock-files/markdown.md')
  await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()])

  let buttons = await page.$$eval('button[name="filename"]', (b) => b.length)
  expect(buttons).toBe(2)

  // Upload two other files and check there are shown in UI
  input = (await page.$('input[type="file"]')) as ElementHandle<HTMLInputElement>
  await input.uploadFile(...['tests/e2e/mock-files/word.docx', 'tests/e2e/mock-files/excel.xlsx'])
  await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()])

  buttons = await page.$$eval('button[name="filename"]', (b) => b.length)
  expect(buttons).toBe(6)

  // Check if all files where uploaded in file sytem
  const w = await Bun.file('tests/e2e/mock-files/word.docx').exists()
  const e = await Bun.file('tests/e2e/mock-files/excel.xlsx').exists()
  const m = await Bun.file('tests/e2e/mock-files/markdown.md').exists()
  expect(w).toBe(true)
  expect(e).toBe(true)
  expect(m).toBe(true)

  // Delete a file and check it has been deleted from UI
  await Promise.all([
    page.click('button[value="excel.xlsx"][formaction="/a/knowledge?action=destroy"]'),
    page.waitForNavigation()
  ])

  buttons = await page.$$eval('button[name="filename"]', (b) => b.length)
  expect(buttons).toBe(4)

  // Return to hompage
  await Promise.all([page.click('a[href="/a"]'), page.waitForNavigation()])
  expect(page.url()).toBe('http://localhost:3000/a')

  await browser.close()
})
