import { afterEach, describe, expect, it, mock } from 'bun:test'

import { clearOrgUsersCache, fetchOrgUsers } from '@/shared/lib/org-users-cache'

import { activityRowContextLabel, activitySenderLabel } from './notification-labels'

describe('activitySenderLabel', () => {
  afterEach(() => {
    clearOrgUsersCache()
    mock.restore()
  })

  it('shows Pierre for automations and updates', () => {
    expect(activitySenderLabel({ type: 'automations', sender: 'uuid' })).toBe('Pierre')
    expect(activitySenderLabel({ type: 'updates', sender: 'Changelog' })).toBe('Pierre')
  })

  it('never shows an email — capitalizes the login fallback', () => {
    expect(activitySenderLabel({ type: 'tickets', sender: 'alice@exemple.fr' })).toBe('Alice')
    expect(activitySenderLabel({ type: 'repayment', sender: 'bob' })).toBe('Bob')
  })

  it('prefers a custom org displayName', async () => {
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
      expect(activitySenderLabel({ type: 'tickets', sender: 'cdubois@exemple.fr' })).toBe(
        'Camille Dubois'
      )
      expect(activitySenderLabel({ type: 'tickets', sender: 'cdubois' })).toBe('Camille Dubois')
    } finally {
      if (previous) globalThis.window = previous
      else delete (globalThis as { window?: Window }).window
    }
  })
})

describe('activityRowContextLabel', () => {
  it('composes module · entity', () => {
    expect(
      activityRowContextLabel({ type: 'tickets', ref: 'REC-1', moduleLabel: 'Réclamations' })
    ).toBe('Réclamations · #REC-1')
    expect(
      activityRowContextLabel({ type: 'repayment', ref: 'LOC-9', moduleLabel: 'Impayés' })
    ).toBe('Impayés · LOC-9')
    expect(
      activityRowContextLabel(
        { type: 'automations', ref: 'AUTO-1', moduleLabel: 'Routines' },
        'Veille'
      )
    ).toBe('Routines · Veille')
    expect(
      activityRowContextLabel({ type: 'updates', ref: 'slug', moduleLabel: 'Mises à jour' })
    ).toBe('Mises à jour')
    expect(
      activityRowContextLabel({
        type: 'repayment',
        ref: 'LOC-9',
        moduleLabel: 'Impayés'
      })
    ).toBe('Impayés · LOC-9')
  })
})
