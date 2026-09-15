import { beforeAll, expect, it } from 'bun:test'

import { createTestUser } from '../test-user'
import {
  clickAndWait,
  createE2EView,
  currentUrl,
  fillInput,
  getCookies,
  navigate
} from './launch-browser'

const EMAIL = 'protected-chat-e2e@example.org'
const PASSWORD = 'protected-chat-password'

beforeAll(async () => {
  await createTestUser(
    {
      email: EMAIL,
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: ['testing_purpose_1']
    },
    PASSWORD
  )
})

it('should grant access to protected config for logged user', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/?config=testing_purpose_1')

  expect(await currentUrl(view)).toBe(
    'http://localhost:3000/login?redirect=%2Fc%3Fconfig%3Dtesting_purpose_1%26data%3D'
  )

  await fillInput(view, 'input[type="email"]', EMAIL)
  await fillInput(view, 'input[type="password"]', PASSWORD)
  await clickAndWait(view, 'button[type="submit"]', {
    url: 'http://localhost:3000/c?config=testing_purpose_1&data='
  })

  const cookie = (await getCookies(view)).find((cookie) =>
    cookie.name.endsWith('pierre.session_token')
  )
  expect(cookie).toBeDefined()

  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=testing_purpose_1&data=')
})
