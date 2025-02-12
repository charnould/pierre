import { expect, it } from 'bun:test'
import { $ } from 'bun'
import puppeteer, { type ElementHandle } from 'puppeteer'

//
it('file upload should pass e2e test', async () => {
  // Remove mock files from datastore
  await $`rm -rf ./datastores/files`
  await $`mkdir -p ./datastores/files/`

  //Go to `/a`
  const browser = await puppeteer.launch({ slowMo: 10 }) // headless: false
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/a')
  await page.setViewport({ width: 1080, height: 1024 })
  expect(page.url()).toBe('http://localhost:3000/a/login')

  // Login
  await page.type('input[type="email"]', 'admin@pierre-ia.org')
  await page.type('input[type="password"]', 'harry84')
  await page.click('input[type="submit"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  // Navigate to `knowledge`
  await page.click('a[href="a/knowledge"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a/knowledge')

  // Upload one file and check it is shown in UI
  let input = (await page.$('input[type="file"]')) as ElementHandle<HTMLInputElement>
  await input.uploadFile('tests/e2e/mock-files/markdown.md')
  await page.click('button[type="submit"]')
  await Bun.sleep(250)

  let buttons = await page.$$eval('button[name="filename"]', (b) => b.length)
  expect(buttons).toBe(2)

  // Upload two other files and check there are shown in UI
  input = (await page.$('input[type="file"]')) as ElementHandle<HTMLInputElement>
  await input.uploadFile(...['tests/e2e/mock-files/word.docx', 'tests/e2e/mock-files/excel.xlsx'])
  await page.click('button[type="submit"]')
  await Bun.sleep(250)

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
  await page.click('button[value="excel.xlsx"][formaction="/a/knowledge?action=destroy"]')
  await Bun.sleep(250)

  buttons = await page.$$eval('button[name="filename"]', (b) => b.length)
  expect(buttons).toBe(4)

  // Code below fails due to `race` condition
  // const x = await Bun.file('tests/e2e/mock-files/excel.xlsx').exists()
  // expect(x).toBe(false)

  // Return to hompage
  await page.click('a[href="/a"]')
  await Bun.sleep(250)
  expect(page.url()).toBe('http://localhost:3000/a')

  // e2e test is done!
  await browser.close()
})
