import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { OrgUser } from '@/shared/types/users'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  if (typeof globals.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    for (const key of ['document', 'window', 'HTMLElement', 'Element', 'Node']) {
      originalGlobals.set(key, globals[key])
    }
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    installedDom = true
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

const alice: OrgUser = {
  login: 'alice',
  email: 'alice@ex.fr',
  role: 'agent',
  config: [],
  hasAvatar: false,
  avatarBytes: 0,
  avatarVersion: 0,
  displayName: 'Alice Martin'
}

describe('CollaboratorPopoverPicker', () => {
  test('affiche le collaborateur sélectionné sous un nom accessible', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { CollaboratorPopoverPicker } = await import('./CollaboratorPopoverPicker')

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(
        <CollaboratorPopoverPicker
          value={alice}
          users={[alice]}
          aria-label="Qui"
          onChange={() => {}}
        />
      )
    })

    const trigger = host.querySelector('[aria-label="Qui"]')
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toContain('Alice Martin')
    expect(trigger?.textContent).toContain('alice')

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })
})
