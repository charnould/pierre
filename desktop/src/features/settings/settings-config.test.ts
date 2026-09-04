import { afterEach, describe, expect, test } from 'bun:test'

import { fetchConfig } from './settings-config'

describe('fetchConfig', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('loads the desktop agent name from the server config route', async () => {
    let requestedUrl = ''
    globalThis.fetch = (async (input) => {
      requestedUrl = input.toString()
      return Response.json({ name: 'Pierre' })
    }) as typeof fetch

    await expect(fetchConfig('https://pierre.example')).resolves.toEqual({ name: 'Pierre' })
    expect(requestedUrl).toBe('https://pierre.example/customization/desktop/config.json')
  })
})
