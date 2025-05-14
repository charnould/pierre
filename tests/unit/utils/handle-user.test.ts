import { beforeAll, expect, it } from 'bun:test'
import { User } from '../../../utils/_schema'
import { db } from '../../../utils/database'
import { get_user, get_users, save_user } from '../../../utils/handle-user'

beforeAll(() => {
  Bun.env.SERVICE = 'pierre-production'
  db('datastore').query('DELETE FROM users').run()
})

it('should insert 2 users', async () => {
  const user_1 = User.parse({
    email: 'test1@pierre-ia.org',
    role: 'administrator',
    config: JSON.stringify(['default', 'demo_team']),
    password_hash: 'password_1'
  })

  const user_2 = User.parse({
    email: 'test2@pierre-ia.org',
    role: 'administrator',
    config: JSON.stringify(['demo_client', 'default']),
    password_hash: 'password_2'
  })

  save_user(user_1)
  save_user(user_2)

  expect(db('datastore').query('SELECT * FROM users').all()).toStrictEqual([
    {
      config: '["default","demo_team"]',
      email: 'test1@pierre-ia.org',
      role: 'administrator',
      password_hash: 'password_1'
    },
    {
      config: '["demo_client","default"]',
      email: 'test2@pierre-ia.org',
      password_hash: 'password_2',
      role: 'administrator'
    }
  ])
})

it('should retrieve 1 user ', async () => {
  expect(get_user('test1@pierre-ia.org')).toStrictEqual({
    config: ['default', 'demo_team'],
    email: 'test1@pierre-ia.org',
    role: 'administrator',
    password_hash: 'password_1'
  })
})

it('should return undefined when no user is found', async () => {
  expect(get_user('charnould@unknown.org')).toBeUndefined()
})

it('should retrieve all users', () => {
  expect(get_users()).toStrictEqual([
    {
      config: ['default', 'demo_team'],
      email: 'test1@pierre-ia.org',
      password_hash: 'password_1',
      role: 'administrator'
    },
    {
      config: ['demo_client', 'default'],
      email: 'test2@pierre-ia.org',
      password_hash: 'password_2',
      role: 'administrator'
    }
  ])
})
