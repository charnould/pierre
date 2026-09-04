import { afterEach, describe, expect, mock, test } from 'bun:test'

import {
  filterMentionSuggestions,
  formatMentionDisplay,
  replyAuthorMentionSeed
} from '@/shared/lib/activities/mentions'
import { clearOrgUsersCache, fetchOrgUsers } from '@/shared/lib/org-users-cache'
import type { OrgUser } from '@/shared/types/users'

import { desktopAgentMentionHandle } from '../../../../../shared/agent-identity'

const orgUser = (login: string, displayName = login): OrgUser => ({
  login,
  email: `${login}@exemple.fr`,
  role: 'collaborator',
  config: ['default'],
  hasAvatar: false,
  avatarBytes: 0,
  avatarVersion: 0,
  displayName
})

describe('agent mention identity', () => {
  test('derives an ASCII handle from the configured name', () => {
    expect(desktopAgentMentionHandle(' Émile Martin ')).toBe('emile-martin')
  })

  test('puts the agent first and removes a colliding user login', () => {
    expect(
      filterMentionSuggestions([orgUser('pierre'), orgUser('alice')], 'pi', {
        name: 'Pierre',
        handle: 'pierre'
      })
    ).toEqual([{ kind: 'agent', name: 'Pierre', handle: 'pierre' }])
  })
})

describe('replyAuthorMentionSeed', () => {
  test('seeds @login from user auteur', () => {
    expect(replyAuthorMentionSeed('user:bob', 'alice')).toBe('@bob ')
    expect(replyAuthorMentionSeed('user:bob@exemple.fr', 'alice@exemple.fr')).toBe('@bob ')
  })

  test('skips self case-insensitively', () => {
    expect(replyAuthorMentionSeed('user:Alice', 'alice')).toBe('')
    expect(replyAuthorMentionSeed('user:alice@exemple.fr', 'alice@exemple.fr')).toBe('')
    expect(replyAuthorMentionSeed('user:alice@exemple.fr', 'alice')).toBe('')
  })

  test('seeds unknown/unprefixed auteur id', () => {
    expect(replyAuthorMentionSeed('cara', 'alice')).toBe('@cara ')
  })

  test('skips non-user authors', () => {
    expect(replyAuthorMentionSeed('agent:bot', 'alice')).toBe('')
    expect(replyAuthorMentionSeed('tenant:LOC-1', 'alice')).toBe('')
    expect(replyAuthorMentionSeed('', 'alice')).toBe('')
  })
})

describe('formatMentionDisplay', () => {
  afterEach(() => {
    clearOrgUsersCache()
    mock.restore()
  })

  test('capitalise le login si le collaborateur est inconnu', () => {
    expect(formatMentionDisplay('cdubois')).toBe('Cdubois')
    expect(formatMentionDisplay('user:cdubois@exemple.fr')).toBe('Cdubois')
  })

  test('affiche le nom custom depuis un login ou un email', async () => {
    const previous = globalThis.window
    globalThis.window = {
      api: {
        getUsers: mock(() =>
          Promise.resolve({
            users: [
              {
                login: 'cdubois',
                email: 'cdubois@exemple.fr',
                role: 'administrator',
                config: ['default'],
                hasAvatar: false,
                avatarBytes: 0,
                displayName: 'Camille Dubois'
              }
            ]
          })
        )
      }
    } as unknown as Window & typeof globalThis
    try {
      await fetchOrgUsers('https://pierre.test')
      expect(formatMentionDisplay('cdubois')).toBe('Camille Dubois')
      expect(formatMentionDisplay('cdubois@exemple.fr')).toBe('Camille Dubois')
      expect(formatMentionDisplay('user:cdubois@exemple.fr')).toBe('Camille Dubois')
    } finally {
      if (previous) globalThis.window = previous
      else delete (globalThis as { window?: Window }).window
    }
  })
})
