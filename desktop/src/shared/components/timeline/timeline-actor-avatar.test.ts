import { afterEach, describe, expect, mock, test } from 'bun:test'

import { actorDisplayName } from '@/shared/components/timeline/timeline-actor-avatar'
import { clearOrgUsersCache, fetchOrgUsers } from '@/shared/lib/org-users-cache'

describe('actorDisplayName', () => {
  let didStubWindow = false
  let windowBeforeStub: typeof globalThis.window | undefined

  afterEach(() => {
    clearOrgUsersCache()
    mock.restore()
    if (!didStubWindow) return
    if (windowBeforeStub) globalThis.window = windowBeforeStub
    else delete (globalThis as { window?: Window }).window
    didStubWindow = false
    windowBeforeStub = undefined
  })

  test('résout le nom custom depuis un auteur user:email', async () => {
    windowBeforeStub = globalThis.window
    didStubWindow = true
    globalThis.window = {
      api: {
        getUsers: mock(() =>
          Promise.resolve({
            users: [
              {
                login: 'cdubois',
                email: 'cdubois@exemple.fr',
                hasAvatar: false,
                avatarBytes: 0,
                displayName: 'Camille Dubois'
              },
              {
                login: 'amartin',
                email: 'amartin@exemple.fr',
                hasAvatar: false,
                avatarBytes: 0,
                displayName: 'amartin'
              }
            ]
          })
        )
      }
    } as unknown as Window & typeof globalThis
    await fetchOrgUsers('https://pierre.test')

    expect(
      actorDisplayName({
        kind: 'user',
        id: 'cdubois@exemple.fr',
        label: 'cdubois@exemple.fr'
      })
    ).toBe('Camille Dubois')
    expect(actorDisplayName({ kind: 'user', id: 'cdubois', label: 'cdubois' })).toBe(
      'Camille Dubois'
    )
    expect(
      actorDisplayName({
        kind: 'unknown',
        id: 'amartin@exemple.fr',
        label: 'amartin@exemple.fr'
      })
    ).toBe('amartin')
  })

  test('garde le label brut si le collaborateur est inconnu', () => {
    expect(
      actorDisplayName({
        kind: 'user',
        id: 'ghost@exemple.fr',
        label: 'ghost@exemple.fr'
      })
    ).toBe('ghost@exemple.fr')
  })
})
