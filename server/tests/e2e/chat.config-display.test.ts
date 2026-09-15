import { expect, it } from 'bun:test'

import { deleteAllUsers } from '../../utils/handle-user'
import { createTestUser } from '../test-user'
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
  await deleteAllUsers()

  await createTestUser(
    {
      email: 'test@test.org',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: ['demo', 'testing_purpose_1', 'testing_purpose_2', 'non_existing']
    },
    'a-complicated-password'
  )

  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/c')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')
  expect(
    (await getCookies(view)).find((cookie) => cookie.name.endsWith('pierre.session_token'))
  ).toBeUndefined()
  await waitForDom(view, 'document.querySelector("img[src=\\"/branding/system.svg\\"]")')
  expect(await evaluate<string>(view, 'document.body.innerText')).toContain('Bonjour')
  expect(await evaluate<number>(view, 'document.querySelectorAll("a[data-config]").length')).toBe(0)

  await navigate(view, 'http://localhost:3000/?config=testing_purpose_2')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_2&data=')
  await waitForDom(view, 'document.querySelector("#root")')
  expect(await evaluate<number>(view, 'document.querySelectorAll("a[data-config]").length')).toBe(0)

  await navigate(view, 'http://localhost:3000/?config=testing_purpose_1')
  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/login?redirect=%2Fc%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  await fillInput(view, 'input[type="email"]', 'test@test.org')
  await fillInput(view, 'input[type="password"]', 'a-complicated-password')
  await clickAndWait(view, 'button[type="submit"]', {
    url: 'http://localhost:3000/c?config=testing_purpose_1&data='
  })
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')
  await waitForDom(view, 'document.querySelector("#root")')
  expect(await evaluate<number>(view, 'document.querySelectorAll("a[data-config]").length')).toBe(0)
})
