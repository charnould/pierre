import { afterEach, describe, expect, test } from 'bun:test'

import { resetCustomization } from '@/shared/lib/instance-customization'
import type { UserPrincipal } from '@/shared/types/users'

import { loadDesktopStartup } from './startup'

const user: UserPrincipal = {
  email: 'alice@bailleur.fr',
  isAdministrator: false,
  moduleIds: ['repayment'],
  chatbotIds: [],
  preferredName: null
}

afterEach(() => {
  resetCustomization()
})

describe('loadDesktopStartup', () => {
  test('returns logged-out settings when the session cannot be restored', async () => {
    window.api = {
      getSettings: async () => ({ url: 'https://pierre.test' }),
      restoreSession: async () => ({ ok: false, message: 'session_expired' })
    } as unknown as typeof window.api

    await expect(loadDesktopStartup()).resolves.toEqual({
      status: 'logged-out',
      settings: { url: 'https://pierre.test' }
    })
  })

  test('returns the accessible stored tab after a restored session', async () => {
    const storage = window.sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: storage
    })
    storage.removeItem('pierre:activeTab')
    window.api = {
      getSettings: async () => ({ url: 'https://pierre.test' }),
      restoreSession: async () => ({ ok: true, user }),
      getSetup: async () => ({ data: { name: 'Hélios' } })
    } as unknown as typeof window.api

    await expect(loadDesktopStartup()).resolves.toMatchObject({
      status: 'logged-in',
      user,
      tab: 'home'
    })
  })

  test('lets a rejected settings read escape to the caller', async () => {
    window.api = {
      getSettings: async () => {
        throw new Error('settings down')
      }
    } as unknown as typeof window.api

    await expect(loadDesktopStartup()).rejects.toThrow('settings down')
  })
})
