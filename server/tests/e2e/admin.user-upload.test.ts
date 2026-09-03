import { expect, it } from 'bun:test'

import { delete_all_users } from '../../utils/handle-user'
import {
  clickAndWait,
  createE2EView,
  currentUrl,
  elementCount,
  fillInput,
  navigate,
  uploadFiles
} from './launch-browser'

it('should upload user file successfully', async () => {
  Bun.env['SERVICE'] = 'pierre-production'
  await delete_all_users()
  await using view = createE2EView()

  // Login and navigate to `knowledge`
  await navigate(view, 'http://localhost:3000/a/login')
  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', Bun.env['AUTH_PASSWORD']!)
  await clickAndWait(view, 'input[type="submit"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')
  await clickAndWait(view, 'a[href="a/users"]', {
    url: 'http://localhost:3000/a/users'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/users')

  // Upload `user_1.xlsx` file
  await uploadFiles(view, 'input[type="file"]', 'tests/e2e/mock-files/users_1.xlsx')
  await clickAndWait(view, 'button[type="submit"]', {
    url: 'http://localhost:3000/a/login'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  // Login and navigate to `knowledge`
  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', Bun.env['AUTH_PASSWORD']!)
  await clickAndWait(view, 'input[type="submit"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')
  await clickAndWait(view, 'a[href="a/users"]', {
    url: 'http://localhost:3000/a/users'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/users')

  // Check if user count is correct
  let li = await elementCount(view, 'li')
  expect(li).toBe(5)

  // Upload `user_2.xlsx` file
  await uploadFiles(view, 'input[type="file"]', 'tests/e2e/mock-files/users_2.xlsx')
  await clickAndWait(view, 'button[type="submit"]', {
    url: 'http://localhost:3000/a/login'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/login')

  // Login and navigate to `knowledge`
  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', Bun.env['AUTH_PASSWORD']!)
  await clickAndWait(view, 'input[type="submit"]', { url: 'http://localhost:3000/a' })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a')
  await clickAndWait(view, 'a[href="a/users"]', {
    url: 'http://localhost:3000/a/users'
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/a/users')

  // Check if user count is correct
  li = await elementCount(view, 'li')
  expect(li).toBe(2)
})
