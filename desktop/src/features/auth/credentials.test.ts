import { describe, expect, test } from 'bun:test'

import { loginWithTypedCredentials, restoreSession } from './credentials'

const user = {
  email: 'a@b.c',
  isAdministrator: false,
  moduleIds: [],
  chatbotIds: []
}

describe('loginWithTypedCredentials', () => {
  test('sends the typed password to login IPC', async () => {
    const login = async (params: { url: string; email: string; password: string }) => {
      expect(params.password).toBe('secret')
      return { ok: true as const, user }
    }
    const previous = globalThis.window
    globalThis.window = { api: { login } } as unknown as Window & typeof globalThis
    try {
      await expect(
        loginWithTypedCredentials({
          url: 'https://pierre.test',
          email: 'a@b.c',
          password: 'secret'
        })
      ).resolves.toEqual({ ok: true, user })
    } finally {
      globalThis.window = previous
    }
  })
})

describe('restoreSession', () => {
  test('restores the session without credentials', async () => {
    const restoreSessionFromApi = async () => ({ ok: true as const, user })
    const previous = globalThis.window
    globalThis.window = {
      api: { restoreSession: restoreSessionFromApi }
    } as unknown as Window & typeof globalThis
    try {
      await expect(restoreSession()).resolves.toEqual({ ok: true, user })
    } finally {
      globalThis.window = previous
    }
  })
})
