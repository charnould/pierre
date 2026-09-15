import { afterAll, expect, it } from 'bun:test'

import { getAuth } from '../../../utils/auth'
import { ENV_ADMIN_EMAIL, ensureEnvAdmin } from '../../../utils/ensure-env-admin'
import { getUser, saveUserAsAdministrator } from '../../../utils/handle-user'
import { createTestUser } from '../../test-user'
import { use_identity_test_env } from './identity-test-env'

use_identity_test_env('_test_ensure_env_admin')

const ORIGINAL_AUTH_PASSWORD = Bun.env['AUTH_PASSWORD']

afterAll(() => {
  if (ORIGINAL_AUTH_PASSWORD === undefined) delete Bun.env['AUTH_PASSWORD']
  else Bun.env['AUTH_PASSWORD'] = ORIGINAL_AUTH_PASSWORD
})

let requestIp = 1
const canSignIn = async (password: string): Promise<boolean> => {
  requestIp += 1
  return (
    await getAuth().handler(
      new Request('http://localhost/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': `203.0.113.${requestIp}`
        },
        body: JSON.stringify({ email: ENV_ADMIN_EMAIL, password })
      })
    )
  ).ok
}

it('creates admin@pierre-ia.org from AUTH_PASSWORD', async () => {
  Bun.env['AUTH_PASSWORD'] = 'initial-password'
  await ensureEnvAdmin()

  expect(await getUser(ENV_ADMIN_EMAIL)).toMatchObject({
    email: ENV_ADMIN_EMAIL,
    isAdministrator: true
  })
  expect(await canSignIn('initial-password')).toBe(true)
})

it('leaves an existing admin unchanged when AUTH_PASSWORD changes', async () => {
  Bun.env['AUTH_PASSWORD'] = 'first-password'
  await ensureEnvAdmin()
  await saveUserAsAdministrator(ENV_ADMIN_EMAIL, ENV_ADMIN_EMAIL, {
    password: 'changed-in-admin'
  })

  Bun.env['AUTH_PASSWORD'] = 'second-password'
  await ensureEnvAdmin()

  expect(await canSignIn('changed-in-admin')).toBe(true)
  expect(await canSignIn('second-password')).toBe(false)
})

it('rejects a password shorter than 8 characters', async () => {
  Bun.env['AUTH_PASSWORD'] = 'short'
  await expect(ensureEnvAdmin()).rejects.toThrow(
    'AUTH_PASSWORD must contain between 8 and 128 characters'
  )
})

it('does not restore a demoted env account', async () => {
  await createTestUser(
    {
      email: ENV_ADMIN_EMAIL,
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: []
    },
    'kept-password'
  )
  Bun.env['AUTH_PASSWORD'] = 'kept-password'
  await ensureEnvAdmin()

  expect(await getUser(ENV_ADMIN_EMAIL)).toMatchObject({ isAdministrator: false })
})
