import { expect, it } from 'bun:test'

import { delete_all_users, save_user } from '../../utils/handle-user'
import {
  clickAndWait,
  createE2EView,
  currentUrl,
  elementHrefs,
  fillInput,
  getCookies,
  navigate,
  waitForDom
} from './launch-browser'

it('should display the correct config options for anonymous and authenticated users', async () => {
  // Initial setup
  Bun.env['SERVICE'] = 'pierre-production'
  await delete_all_users()

  await save_user({
    email: 'test@test.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('a-complicated-password'),
    config: JSON.stringify(['demo', 'testing_purpose_1', 'testing_purpose_2', 'non_existing'])
  })

  await using view = createE2EView()

  // Case 1
  // Visit chatbot page as an anonymous user
  await navigate(view, 'http://localhost:3000/c')
  const cookie = (await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')
  expect(cookie).toBeUndefined()

  // Case 2
  // Visit an alternative non protected config as an anonymous user
  await navigate(view, 'http://localhost:3000/?config=testing_purpose_2')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_2&data=')
  await waitForDom(view, 'document.querySelector("a[data-config]")')

  let configs = await elementHrefs(view, 'a[data-config]')

  expect(configs).toEqual([
    'http://localhost:3000/?config=demo',
    'http://localhost:3000/?config=default',
    'http://localhost:3000/?config=testing_purpose_1',
    'http://localhost:3000/?config=testing_purpose_2'
  ])

  // Case 3
  // Visit a protected config and log in
  await navigate(view, 'http://localhost:3000/?config=testing_purpose_1')
  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/a/login?redirection=c%2F%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  await fillInput(view, 'input[type="email"]', 'test@test.org')
  await fillInput(view, 'input[type="password"]', 'a-complicated-password')
  await clickAndWait(view, 'input[type="submit"]', {
    url: 'http://localhost:3000/c?config=testing_purpose_1&data='
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')

  await waitForDom(view, 'document.querySelector("a[data-config]")')

  configs = await elementHrefs(view, 'a[data-config]')

  expect(configs).toEqual([
    'http://localhost:3000/?config=demo',
    'http://localhost:3000/?config=testing_purpose_1',
    'http://localhost:3000/?config=testing_purpose_2'
  ])
})
