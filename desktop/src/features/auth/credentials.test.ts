import { describe, expect, test } from 'bun:test'

import { loginWithStoredCredentials, loginWithTypedCredentials } from './credentials'

describe('loginWithTypedCredentials', () => {
  test('sends the typed password to login IPC', async () => {
    const login = async (params: { url: string; email: string; password: string }) => {
      expect(params.password).toBe('secret')
      return { ok: true as const }
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
      ).resolves.toEqual({ ok: true })
    } finally {
      globalThis.window = previous
    }
  })
})

describe('loginWithStoredCredentials', () => {
  test('uses loginStored and never reads a password', async () => {
    const loginStored = async () => ({ ok: true as const })
    const previous = globalThis.window
    globalThis.window = { api: { loginStored } } as unknown as Window & typeof globalThis
    try {
      await expect(loginWithStoredCredentials()).resolves.toEqual({ ok: true })
    } finally {
      globalThis.window = previous
    }
  })
})
