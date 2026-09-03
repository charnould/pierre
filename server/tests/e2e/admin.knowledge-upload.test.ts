import { expect, it } from 'bun:test'

import { $ } from 'bun'

import {
  clickAndWait,
  createE2EView,
  currentUrl,
  elementCount,
  fillInput,
  navigate,
  uploadFiles
} from './launch-browser'

it('should upload knowledge files successfully', async () => {
  // Remove mock files from datastore
  // Remove mock files from datastore
  Bun.env['SERVICE'] = 'pierre-production'
  await $`rm -rf ./datastores/${Bun.env['SERVICE']}/files`
  await $`mkdir -p ./datastores/${Bun.env['SERVICE']}/files/`

  //Go to `/a`
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/a')
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  // Login
  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', Bun.env['AUTH_PASSWORD']!)
  await clickAndWait(view, 'input[type="submit"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')

  // Navigate to `knowledge`
  await clickAndWait(view, 'a[href="a/knowledge"]', {
    url: 'http://localhost:3000/a/knowledge'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/knowledge')

  // Upload one file and check it is shown in UI
  await uploadFiles(view, 'input[type="file"]', 'tests/e2e/mock-files/markdown.md')
  await clickAndWait(view, 'button[type="submit"]', {
    dom: 'document.querySelectorAll(\'button[name="filename"]\').length === 2'
  })

  let buttons = await elementCount(view, 'button[name="filename"]')
  expect(buttons).toBe(2)

  // Upload two other files and check there are shown in UI
  await uploadFiles(
    view,
    'input[type="file"]',
    'tests/e2e/mock-files/word.docx',
    'tests/e2e/mock-files/excel.xlsx'
  )
  await clickAndWait(view, 'button[type="submit"]', {
    dom: 'document.querySelectorAll(\'button[name="filename"]\').length === 6'
  })

  buttons = await elementCount(view, 'button[name="filename"]')
  expect(buttons).toBe(6)

  // Check if all files where uploaded in file sytem
  const w = await Bun.file('tests/e2e/mock-files/word.docx').exists()
  const e = await Bun.file('tests/e2e/mock-files/excel.xlsx').exists()
  const m = await Bun.file('tests/e2e/mock-files/markdown.md').exists()
  expect(w).toBe(true)
  expect(e).toBe(true)
  expect(m).toBe(true)

  // Delete a file and check it has been deleted from UI
  await clickAndWait(view, 'button[value="excel.xlsx"][formaction="/a/knowledge?action=destroy"]', {
    dom: 'document.querySelectorAll(\'button[name="filename"]\').length === 4'
  })

  buttons = await elementCount(view, 'button[name="filename"]')
  expect(buttons).toBe(4)

  // Return to homepage
  await clickAndWait(view, 'a[href="/a"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')
})
