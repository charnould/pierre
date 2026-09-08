import { expect, it } from 'bun:test'

import { delete_all_users, save_user } from '../../utils/handle-user'
import {
  clickAndWait,
  createE2EView,
  currentUrl,
  evaluate,
  fillInput,
  getCookies,
  navigate,
  waitForDom
} from './launch-browser'

it('loads the requested chatbot without a profile selector', async () => {
  Bun.env['SERVICE'] = 'pierre-production'
  await delete_all_users()

  await save_user({
    email: 'test@test.org',
    role: 'collaborator',
    password_hash: await Bun.password.hash('a-complicated-password'),
    config: JSON.stringify(['demo', 'testing_purpose_1', 'testing_purpose_2', 'non_existing'])
  })

  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/c')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')
  expect((await getCookies(view)).find((cookie) => cookie.name === 'pierre-ia')).toBeUndefined()
  await waitForDom(view, 'document.querySelector("img[src=\\"/branding/system.svg\\"]")')
  expect(await evaluate<string>(view, 'document.body.innerText')).toContain('Bonjour')
  expect(await evaluate<number>(view, 'document.querySelectorAll("a[data-config]").length')).toBe(0)

  await navigate(view, 'http://localhost:3000/?config=testing_purpose_2')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_2&data=')
  await waitForDom(view, 'document.querySelector("#root")')
  expect(await evaluate<number>(view, 'document.querySelectorAll("a[data-config]").length')).toBe(0)

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
  await waitForDom(view, 'document.querySelector("#root")')
  expect(await evaluate<number>(view, 'document.querySelectorAll("a[data-config]").length')).toBe(0)
})
