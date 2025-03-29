import { Database } from 'bun:sqlite'
import { beforeAll, expect, it } from 'bun:test'
import { User } from '../../../utils/_schema'
import { db } from '../../../utils/database'
import { delete_user, get_user, get_users, save_user } from '../../../utils/handle-user'

//
//
//
//
//
//
beforeAll(() => {
  const database = db('datastore')
  if (database instanceof Database) database.query('DELETE FROM users').run()
})

//
//
//
//
//
//
it('should insert 2 users', async () => {
  const user_1 = User.parse({
    email: 'charnould@pierre-ia.org',
    role: 'administrator',
    config: 'default',
    password_hash: 'password_1'
  })

  save_user(user_1)

  const user_2 = User.parse({
    email: 'charnould@icfhabitat.fr',
    role: 'administrator',
    config: 'icfhabitat.fr',
    password_hash: 'password_2'
  })

  save_user(user_2)

  const database = db('datastore')
  if (database instanceof Database)
    expect(database.query('SELECT * FROM users').all()).toStrictEqual([
      {
        config: 'default',
        email: 'charnould@pierre-ia.org',
        role: 'administrator',
        password_hash: 'password_1'
      },
      {
        config: 'icfhabitat.fr',
        email: 'charnould@icfhabitat.fr',
        password_hash: 'password_2',
        role: 'administrator'
      }
    ])
})

//
//
//
//
//
//
it('should retrieve 1 user ', async () => {
  expect(get_user('charnould@pierre-ia.org')).toStrictEqual({
    config: 'default',
    email: 'charnould@pierre-ia.org',
    role: 'administrator',
    password_hash: 'password_1'
  })
})

//
//
//
//
//
//
it('should retrieve no user ', async () => {
  expect(get_user('charnould@unknown.org')).toBe(undefined)
})

//
//
//
//
//
//
it('should retrieve all users', () => {
  expect(get_users()).toStrictEqual([
    {
      config: 'icfhabitat.fr',
      email: 'charnould@icfhabitat.fr',
      password_hash: 'password_2',
      role: 'administrator'
    },
    {
      config: 'default',
      email: 'charnould@pierre-ia.org',
      password_hash: 'password_1',
      role: 'administrator'
    }
  ])
})

//
//
//
//
//
//
it('should delete a user', async () => {
  delete_user('charnould@icfhabitat.fr')
  expect(get_users()).toStrictEqual([
    {
      config: 'default',
      email: 'charnould@pierre-ia.org',
      password_hash: 'password_1',
      role: 'administrator'
    }
  ])
})
