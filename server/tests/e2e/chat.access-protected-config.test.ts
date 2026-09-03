import { expect, it } from 'bun:test'

import {
  clickAndWait,
  createE2EView,
  currentUrl,
  fillInput,
  getCookies,
  navigate
} from './launch-browser'

it('should grant access to protected config for logged user', async () => {
  Bun.env['SERVICE'] = 'pierre-production'
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/?config=testing_purpose_1')

  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  await fillInput(view, 'input[type="email"]', 'admin@pierre-ia.org')
  await fillInput(view, 'input[type="password"]', Bun.env['AUTH_PASSWORD']!)
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/c?config=testing_purpose_1&data='
  })

  const cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')
})
