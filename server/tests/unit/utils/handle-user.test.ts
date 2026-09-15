import { expect, it } from 'bun:test'

import { getAuth } from '../../../utils/auth'
import {
  createUser,
  deleteAllUsers,
  deleteUserAsAdministrator,
  getUser,
  getUsers,
  importUserPasswords,
  saveUserAsAdministrator
} from '../../../utils/handle-user'
import { createTestUser } from '../../test-user'
import { use_identity_test_env } from './identity-test-env'

use_identity_test_env('_test_handle_user')

let requestIp = 1
const canSignIn = async (email: string, password: string): Promise<boolean> => {
  requestIp += 1
  return (
    await getAuth().handler(
      new Request('http://localhost/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': `198.51.100.${requestIp}`
        },
        body: JSON.stringify({ email, password })
      })
    )
  ).ok
}

it('stores normalized users without exposing Better Auth storage fields', async () => {
  await createTestUser({
    email: ' Test1@Pierre-IA.org ',
    isAdministrator: true,
    moduleIds: ['tickets', 'automations', 'tickets'],
    chatbotIds: ['default', 'demo', 'default']
  })
  await createTestUser({
    email: 'test2@pierre-ia.org',
    isAdministrator: false,
    moduleIds: ['about'],
    chatbotIds: ['demo', 'default']
  })

  expect(await getUsers()).toStrictEqual([
    {
      email: 'test1@pierre-ia.org',
      isAdministrator: true,
      moduleIds: ['tickets', 'automations'],
      chatbotIds: ['default', 'demo']
    },
    {
      email: 'test2@pierre-ia.org',
      isAdministrator: false,
      moduleIds: ['about'],
      chatbotIds: ['demo', 'default']
    }
  ])
})

it('retrieves users by normalized email and deletes all identity records', async () => {
  await createTestUser({
    email: 'test1@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['default']
  })

  expect(await getUser(' TEST1@PIERRE-IA.ORG ')).toStrictEqual({
    email: 'test1@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['default']
  })

  await deleteAllUsers()
  expect(await getUsers()).toEqual([])
})

it('creates users without overwriting duplicates', async () => {
  const user = {
    email: 'unique@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: []
  }
  expect(await createUser({ ...user, password: 'first-password' })).toBe(true)
  expect(await createUser({ ...user, password: 'second-password' })).toBe(false)
  expect(await canSignIn(user.email, 'first-password')).toBe(true)
  expect(await canSignIn(user.email, 'second-password')).toBe(false)
})

it('updates access and passwords in one write', async () => {
  await createTestUser(
    {
      email: 'admin@pierre-ia.org',
      isAdministrator: true,
      moduleIds: [],
      chatbotIds: ['default']
    },
    'admin-password'
  )
  await createTestUser(
    {
      email: 'member@pierre-ia.org',
      isAdministrator: false,
      moduleIds: ['tickets'],
      chatbotIds: ['default']
    },
    'old-password'
  )

  expect(
    await saveUserAsAdministrator('admin@pierre-ia.org', 'member@pierre-ia.org', {
      isAdministrator: true,
      moduleIds: ['automations'],
      chatbotIds: ['demo'],
      password: 'new-password'
    })
  ).toMatchObject({
    ok: true,
    user: {
      email: 'member@pierre-ia.org',
      isAdministrator: true,
      moduleIds: ['automations'],
      chatbotIds: ['demo']
    }
  })
  expect(await canSignIn('member@pierre-ia.org', 'old-password')).toBe(false)
  expect(await canSignIn('member@pierre-ia.org', 'new-password')).toBe(true)
})

it('imports passwords while preserving existing business access', async () => {
  await createTestUser(
    {
      email: 'existing@pierre-ia.org',
      isAdministrator: false,
      moduleIds: ['tickets'],
      chatbotIds: ['default']
    },
    'old-password'
  )

  expect(
    await importUserPasswords([
      { email: 'existing@pierre-ia.org', password: 'new-password' },
      { email: 'created@pierre-ia.org', password: 'created-password' }
    ])
  ).toEqual({ created: 1, updated: 1 })
  expect(await getUser('existing@pierre-ia.org')).toMatchObject({
    moduleIds: ['tickets'],
    chatbotIds: ['default']
  })
  expect(await canSignIn('existing@pierre-ia.org', 'new-password')).toBe(true)
  expect(await getUser('created@pierre-ia.org')).toMatchObject({
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: []
  })
})

it('rejects a failed import before writing any user', async () => {
  await expect(
    importUserPasswords([
      { email: 'ok@pierre-ia.org', password: 'created-password' },
      { email: 'not-an-email', password: 'created-password' }
    ])
  ).rejects.toThrow()
  expect(await getUsers()).toEqual([])
})

it('prevents deleting the last administrator and deletes another user', async () => {
  await createTestUser({
    email: 'admin@pierre-ia.org',
    isAdministrator: true,
    moduleIds: [],
    chatbotIds: []
  })
  await createTestUser({
    email: 'member@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: []
  })

  expect(
    await deleteUserAsAdministrator('other-admin@pierre-ia.org', 'admin@pierre-ia.org')
  ).toEqual({ ok: false, code: 'last_administrator' })
  expect(
    await deleteUserAsAdministrator('admin@pierre-ia.org', 'member@pierre-ia.org')
  ).toMatchObject({ ok: true })
  expect(await getUser('member@pierre-ia.org')).toBeUndefined()
})
