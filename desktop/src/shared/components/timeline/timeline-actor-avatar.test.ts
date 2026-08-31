import { afterEach, describe, expect, mock, test } from 'bun:test'

import {
  actorDisplayName,
  avatarFallbackClass
} from '@/shared/components/timeline/timeline-actor-avatar'
import { clearOrgUsersCache, fetchOrgUsers } from '@/shared/lib/org-users-cache'
import type { TimelineActorKind } from '@/shared/lib/timeline/parse-activity-author'

describe('avatarFallbackClass', () => {
  test('maps each kind to timeline token classes', () => {
    const cases: Array<[TimelineActorKind, string]> = [
      ['agent', 'bg-timeline-bot text-timeline-bot-foreground'],
      ['automation', 'bg-timeline-bot text-timeline-bot-foreground'],
      ['system', 'bg-timeline-bot text-timeline-bot-foreground'],
      ['database', 'bg-timeline-database text-timeline-database-foreground'],
      ['user', 'bg-timeline-user text-timeline-user-foreground'],
      ['tenant', 'bg-timeline-tenant text-timeline-tenant-foreground'],
      ['external', 'bg-timeline-external text-timeline-external-foreground'],
      ['candidate', 'bg-timeline-candidate text-timeline-candidate-foreground'],
      ['unknown', 'bg-timeline-user text-timeline-user-foreground']
    ]

    for (const [kind, expected] of cases) {
      expect(avatarFallbackClass(kind)).toBe(expected)
    }
  })
})

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
                role: 'administrator',
                config: ['default'],
                hasAvatar: false,
                avatarBytes: 0,
                displayName: 'Camille Dubois'
              },
              {
                login: 'amartin',
                email: 'amartin@exemple.fr',
                role: 'collaborator',
                config: ['default'],
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
