import { Database } from 'bun:sqlite'
import { expect, it } from 'bun:test'

import {
  createUser,
  deleteAllUsers,
  deleteUser,
  deleteUserAsAdministrator,
  getUser,
  getUsers,
  importUserPasswords,
  saveUser
} from '../../../utils/handle-user'
import { datastorePaths } from '../../../utils/paths'
import { use_identity_test_env } from './identity-test-env'

use_identity_test_env('_test_handle_user')

it('stores normalized users without exposing the SQLite row shape', async () => {
  await saveUser({
    email: ' Test1@Pierre-IA.org ',
    isAdministrator: true,
    moduleIds: ['tickets', 'automations', 'tickets'],
    chatbotIds: ['default', 'demo', 'default'],
    passwordHash: 'password_1'
  })

  await saveUser({
    email: 'test2@pierre-ia.org',
    isAdministrator: false,
    moduleIds: ['about'],
    chatbotIds: ['demo', 'default'],
    passwordHash: 'password_2'
  })

  expect(await getUsers()).toStrictEqual([
    {
      email: 'test1@pierre-ia.org',
      isAdministrator: true,
      moduleIds: ['tickets', 'automations'],
      chatbotIds: ['default', 'demo'],
      passwordHash: 'password_1'
    },
    {
      email: 'test2@pierre-ia.org',
      isAdministrator: false,
      moduleIds: ['about'],
      chatbotIds: ['demo', 'default'],
      passwordHash: 'password_2'
    }
  ])
})

it('retrieves and deletes users by normalized email', async () => {
  await saveUser({
    email: 'test1@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['default'],
    passwordHash: 'password_1'
  })

  expect(await getUser(' TEST1@PIERRE-IA.ORG ')).toStrictEqual({
    email: 'test1@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['default'],
    passwordHash: 'password_1'
  })

  await deleteUser(' TEST1@PIERRE-IA.ORG ')
  expect(await getUser('test1@pierre-ia.org')).toBeUndefined()
})

it('updates user access atomically without replacing preferences or avatar', async () => {
  await saveUser({
    email: 'test1@pierre-ia.org',
    isAdministrator: false,
    moduleIds: ['tickets'],
    chatbotIds: ['default'],
    passwordHash: 'password_1'
  })
  using db = new Database(datastorePaths().database)
  db.run(`UPDATE users SET preferences = '{"display_name":"Alice"}', avatar = X'0102'
    WHERE email = 'test1@pierre-ia.org'`)

  await saveUser({
    email: 'test1@pierre-ia.org',
    isAdministrator: true,
    moduleIds: ['automations'],
    chatbotIds: ['demo'],
    passwordHash: 'password_2'
  })

  expect(
    db
      .query<{ preferences: string; avatar: Uint8Array }, []>(
        `SELECT preferences, avatar FROM users WHERE email = 'test1@pierre-ia.org'`
      )
      .get()
  ).toEqual({
    preferences: '{"display_name":"Alice"}',
    avatar: new Uint8Array([1, 2])
  })
})

it('deletes all users', async () => {
  await deleteAllUsers()
  expect(await getUsers()).toEqual([])
})

it('creates without overwriting a concurrent duplicate', async () => {
  const user = {
    email: 'unique@pierre-ia.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: [],
    passwordHash: 'first'
  }
  expect(await createUser(user)).toBe(true)
  expect(await createUser({ ...user, passwordHash: 'second' })).toBe(false)
  expect((await getUser(user.email))?.passwordHash).toBe('first')
})

it('imports only password hashes for existing users', async () => {
  await saveUser({
    email: 'existing@pierre-ia.org',
    isAdministrator: true,
    moduleIds: ['tickets'],
    chatbotIds: ['default'],
    passwordHash: 'old'
  })
  expect(
    await importUserPasswords([
      { email: 'existing@pierre-ia.org', passwordHash: 'new' },
      { email: 'created@pierre-ia.org', passwordHash: 'created' }
    ])
  ).toEqual({ created: 1, updated: 1 })
  expect(await getUser('existing@pierre-ia.org')).toMatchObject({
    isAdministrator: true,
    moduleIds: ['tickets'],
    chatbotIds: ['default'],
    passwordHash: 'new'
  })
  expect(await getUser('created@pierre-ia.org')).toMatchObject({
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: []
  })
})

it('keeps one administrator under concurrent deletion attempts', async () => {
  const first = {
    email: 'first-admin@pierre-ia.org',
    isAdministrator: true,
    moduleIds: [],
    chatbotIds: [],
    passwordHash: 'first'
  }
  const second = { ...first, email: 'second-admin@pierre-ia.org' }
  await saveUser(first)
  await saveUser(second)

  const results = await Promise.all([
    deleteUserAsAdministrator(first.email, second.email),
    deleteUserAsAdministrator(second.email, first.email)
  ])
  expect(results.filter(({ ok }) => ok)).toHaveLength(1)
  expect((await getUsers()).filter(({ isAdministrator }) => isAdministrator)).toHaveLength(1)
})
