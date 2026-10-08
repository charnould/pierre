import { describe, expect, test } from 'bun:test'

import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { AppErrorBoundary } from './AppErrorBoundary'

function Boom(): never {
  throw new Error('storedOrDefault is not defined')
}

describe('AppErrorBoundary', () => {
  test('shows the exception message', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(
        <AppErrorBoundary>
          <Boom />
        </AppErrorBoundary>
      )
    })
    expect(host.textContent).toContain('Une erreur est survenue')
    expect(host.textContent).toContain('storedOrDefault is not defined')
    await act(async () => root.unmount())
    host.remove()
  })
})
