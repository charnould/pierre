import { afterEach, describe, expect, test } from 'bun:test'

import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { UiSettingsProvider, useUiSettings } from './UiSettingsContext'

function Probe() {
  const { loading } = useUiSettings()
  return <p>{loading ? 'loading' : 'ready'}</p>
}

describe('UiSettingsProvider', () => {
  const previous = window.api

  afterEach(() => {
    window.api = previous
  })

  test('leaves loading when the initial read fails', async () => {
    window.api = {
      getUiSettings: async () => {
        throw new Error('settings down')
      },
      getUiSettingsPath: async () => '/tmp/ui-settings.json'
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(
        <UiSettingsProvider>
          <Probe />
        </UiSettingsProvider>
      )
      await Promise.resolve()
    })
    expect(host.textContent).toBe('ready')
    await act(async () => root.unmount())
    host.remove()
  })
})
