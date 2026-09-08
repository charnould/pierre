import { beforeAll, expect, it } from 'bun:test'

import { delete_all_users, save_user } from '../../utils/handle-user'
import {
  clickAndWait,
  createE2EView,
  currentUrl,
  evaluate,
  fillInput,
  getCookies,
  navigate
} from './launch-browser'

beforeAll(async () => {
  Bun.env['SERVICE'] = 'pierre-production'
  await delete_all_users()
  await save_user({
    email: 'test@test.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('complicated-test-password'),
    config: JSON.stringify(['demo', 'testing_purpose_1', 'non_existing'])
  })
})

it('should redirect and resolve configuration access correctly for anonymous and authenticated users', async () => {
  await using view = createE2EView()

  // Visit chatbot page as an anonymous user
  await navigate(view, 'http://localhost:3000/c')
  let cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')
  expect(cookie).toBeUndefined()

  // Attempt to access a protected config without authentication
  await navigate(view, 'http://localhost:3000/?config=testing_purpose_1')
  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  // Fill in login credentials and submit form
  await fillInput(view, 'input[type="email"]', 'test@test.org')
  await fillInput(view, 'input[type="password"]', 'complicated-test-password')
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/c?config=testing_purpose_1&data='
  })

  // Verify redirection to the requested config after login
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')
  cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(cookie).toBeDefined()

  await navigate(view, 'http://localhost:3000/c?config=non_existing&data=')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=non_existing&data=')
  expect(await evaluate<string>(view, 'document.body.textContent')).toContain(
    'Configuration introuvable.'
  )

  await navigate(view, 'http://localhost:3000/c?config=hello_wordg&data=')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=hello_wordg&data=')
  expect(await evaluate<string>(view, 'document.body.textContent')).toContain(
    'Configuration introuvable.'
  )

  await navigate(view, 'http://localhost:3000/c?config=demo&data=')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=demo&data=')
})
