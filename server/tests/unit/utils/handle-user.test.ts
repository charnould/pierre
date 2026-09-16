import { Database } from 'bun:sqlite'
import { expect, it } from 'bun:test'

import { getAuth } from '../../../utils/auth'
import {
  createUser,
  createUserProfile,
  deleteAllUsers,
  deleteUserAsAdministrator,
  deleteUserProfile,
  getStoredUser,
  getUser,
  getUsers,
  importUserPasswords,
  saveUserAsAdministrator,
  saveUserProfile
} from '../../../utils/handle-user'
import { datastorePaths } from '../../../utils/paths'
import { createTestUser } from '../../test-user'
import { use_identity_test_env } from './identity-test-env'

const storedAccessColumns = (email: string) => {
  using db = new Database(datastorePaths().database)
  return db
    .query<{ module_ids: string; chatbot_ids: string }, [string]>(
      `SELECT module_ids, chatbot_ids FROM users WHERE email = ?`
    )
    .get(email.trim().toLowerCase())
}

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
  expect(await createUser({ ...user, password: 'first-password', profileId: null })).toMatchObject({
    ok: true,
    user: { email: user.email, profileId: null }
  })
  expect(await createUser({ ...user, password: 'second-password', profileId: null })).toEqual({
    ok: false,
    code: 'user_exists'
  })
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

it('resolves access from the attached profile and clears stored user columns', async () => {
  const created = await createUserProfile({
    name: 'Gestionnaire locatif',
    moduleIds: ['tickets', 'repayment'],
    chatbotIds: ['default']
  })
  if (!created.ok) throw new Error('profile')
  await createTestUser({
    email: 'linked@pierre-ia.org',
    isAdministrator: false,
    moduleIds: ['about'],
    chatbotIds: ['demo']
  })
  expect(
    await saveUserAsAdministrator('admin@pierre-ia.org', 'linked@pierre-ia.org', {
      profileId: created.profile.id,
      moduleIds: ['ventes'],
      chatbotIds: ['zmode']
    })
  ).toMatchObject({
    ok: true,
    user: {
      profileId: created.profile.id,
      moduleIds: ['tickets', 'repayment'],
      chatbotIds: ['default'],
      isAdministrator: false
    }
  })
  expect(await getUser('linked@pierre-ia.org')).toMatchObject({
    moduleIds: ['tickets', 'repayment'],
    chatbotIds: ['default']
  })
  expect(storedAccessColumns('linked@pierre-ia.org')).toEqual({
    module_ids: '[]',
    chatbot_ids: '[]'
  })

  const saved = await saveUserProfile(created.profile.id, {
    moduleIds: ['bulk'],
    chatbotIds: ['demo']
  })
  if (!saved.ok) throw new Error('profile')
  expect(await getUser('linked@pierre-ia.org')).toMatchObject({
    moduleIds: ['bulk'],
    chatbotIds: ['demo']
  })
})

it('detaches a profile by writing the effective access as custom columns', async () => {
  const created = await createUserProfile({
    name: 'Comptable',
    moduleIds: ['tickets', 'repayment'],
    chatbotIds: ['default']
  })
  if (!created.ok) throw new Error('profile')
  expect(
    await createUser({
      email: 'detached@pierre-ia.org',
      password: 'test-password-123',
      isAdministrator: false,
      moduleIds: ['about'],
      chatbotIds: ['demo'],
      profileId: created.profile.id
    })
  ).toMatchObject({
    ok: true,
    user: {
      email: 'detached@pierre-ia.org',
      profileId: created.profile.id,
      moduleIds: ['tickets', 'repayment'],
      chatbotIds: ['default']
    }
  })
  expect(storedAccessColumns('detached@pierre-ia.org')).toEqual({
    module_ids: '[]',
    chatbot_ids: '[]'
  })

  expect(
    await saveUserAsAdministrator('admin@pierre-ia.org', 'detached@pierre-ia.org', {
      profileId: null
    })
  ).toMatchObject({
    ok: true,
    user: {
      profileId: null,
      moduleIds: ['tickets', 'repayment'],
      chatbotIds: ['default']
    }
  })
  expect(storedAccessColumns('detached@pierre-ia.org')).toEqual({
    module_ids: JSON.stringify(['tickets', 'repayment']),
    chatbot_ids: JSON.stringify(['default'])
  })
  expect(await getStoredUser('detached@pierre-ia.org')).toMatchObject({
    profileId: null,
    moduleIds: ['tickets', 'repayment'],
    chatbotIds: ['default']
  })
})

it('detaches a profile to empty custom columns and returns normalized access', async () => {
  const created = await createUserProfile({
    name: 'Vide',
    moduleIds: ['tickets'],
    chatbotIds: ['default']
  })
  if (!created.ok) throw new Error('profile')
  await createUser({
    email: 'empty@pierre-ia.org',
    password: 'test-password-123',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: [],
    profileId: created.profile.id
  })

  expect(
    await saveUserAsAdministrator('admin@pierre-ia.org', 'empty@pierre-ia.org', {
      profileId: null,
      moduleIds: [],
      chatbotIds: []
    })
  ).toEqual({
    ok: true,
    user: {
      email: 'empty@pierre-ia.org',
      isAdministrator: false,
      profileId: null,
      moduleIds: [],
      chatbotIds: []
    }
  })
  expect(storedAccessColumns('empty@pierre-ia.org')).toEqual({
    module_ids: '[]',
    chatbot_ids: '[]'
  })

  expect(
    await saveUserAsAdministrator('admin@pierre-ia.org', 'empty@pierre-ia.org', {
      moduleIds: ['tickets', 'tickets', 'about'],
      chatbotIds: ['default', 'demo', 'default']
    })
  ).toMatchObject({
    ok: true,
    user: {
      profileId: null,
      moduleIds: ['tickets', 'about'],
      chatbotIds: ['default', 'demo']
    }
  })
})

it('refuses to delete a profile still attached to a user', async () => {
  const created = await createUserProfile({
    name: 'Technicien',
    moduleIds: ['tickets'],
    chatbotIds: ['default']
  })
  if (!created.ok) throw new Error('profile')
  await createUser({
    email: 'tech@pierre-ia.org',
    password: 'test-password-123',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: [],
    profileId: created.profile.id
  })
  expect(await deleteUserProfile(created.profile.id)).toEqual({
    ok: false,
    code: 'profile_in_use'
  })
  expect(await getUser('tech@pierre-ia.org')).toMatchObject({
    moduleIds: ['tickets'],
    chatbotIds: ['default']
  })
})
