import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { clearOrgUsersCache, fetchOrgUsers } from '@/shared/lib/org-users-cache'
import type { OrgUser } from '@/shared/types/users'

import { UserIdentity } from './UsersPanel'

const originalWindow = globalThis.window

beforeEach(() => {
  clearOrgUsersCache()
})

afterEach(() => {
  clearOrgUsersCache()
  globalThis.window = originalWindow
})

describe('UserIdentity', () => {
  test('renders the cached usage name, email and shared avatar', async () => {
    const orgUser: OrgUser = {
      login: 'alice',
      email: 'alice@example.org',
      displayName: 'Alice Martin',
      hasAvatar: false,
      avatarBytes: 0,
      avatarVersion: 0
    }
    globalThis.window = {
      api: { getUsers: async () => ({ users: [orgUser] }) }
    } as unknown as Window & typeof globalThis
    await fetchOrgUsers('https://pierre.test')

    const html = renderToStaticMarkup(<UserIdentity email={orgUser.email} />)
    expect(html).toContain('data-slot="avatar"')
    expect(html).toContain('Alice Martin')
    expect(html).toContain('alice@example.org')
  })

  test('falls back to the email login while the organization cache is empty', () => {
    const html = renderToStaticMarkup(<UserIdentity email="new.user@example.org" />)
    expect(html).toContain('new.user')
    expect(html).toContain('new.user@example.org')
  })
})
