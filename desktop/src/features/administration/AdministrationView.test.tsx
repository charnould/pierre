import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'
import { renderToStaticMarkup } from 'react-dom/server'

import type { UserPrincipal } from '@/shared/types/users'

import { AdministrationView } from './AdministrationView'

const user: UserPrincipal = {
  email: 'admin@example.org',
  isAdministrator: true,
  moduleIds: ['tickets'],
  chatbotIds: ['default'],
  preferredName: null
}

function view(hidden = false) {
  return (
    <AdministrationView
      hidden={hidden}
      url="https://pierre.test"
      user={user}
      onHome={() => {}}
      onCurrentUserPasswordChange={async () => {}}
      onUserChange={() => {}}
    />
  )
}

describe('AdministrationView', () => {
  test('opens on the administration form', () => {
    const html = renderToStaticMarkup(view())
    expect(html).toContain('max-w-5xl')
    expect(html).not.toContain('max-w-7xl')
    expect(html.match(/data-slot="card"(?=[\s>])/g)?.length).toBe(3)
    expect(html.match(/bg-control/g)?.length).toBe(11)
    expect(html).toContain('border-border')
    expect(html).toContain('border-border/60')
    expect(html).not.toContain('text-primary underline-offset-4')
    expect(html).not.toContain('bg-muted')
    expect(html).not.toContain('home-door')
  })

  test('uses the tab-panel hiding contract', () => {
    const html = renderToStaticMarkup(view(true))
    expect(html).toContain('data-tab-panel="true"')
    expect(html).toContain('hidden')
  })
})

describe('AdministrationView readiness', () => {
  let installedDom = false
  const previous = new Map<string, unknown>()

  beforeAll(() => {
    const globals = globalThis as Record<string, unknown>
    const existingWindow = globals.window as { setTimeout?: unknown } | undefined
    const hasWorkingDom =
      typeof globals.document !== 'undefined' && typeof existingWindow?.setTimeout === 'function'
    if (!hasWorkingDom) {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
      for (const key of ['document', 'window', 'HTMLElement', 'Element', 'Node', 'SVGElement']) {
        previous.set(key, globals[key])
        globals[key] = dom.window[key as keyof typeof dom.window]
      }
      installedDom = true
    }
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterAll(() => {
    if (!installedDom) return
    const globals = globalThis as Record<string, unknown>
    for (const [key, value] of previous) {
      if (value === undefined) delete globals[key]
      else globals[key] = value
    }
  })

  test('shows the server state only on setup modules', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const previousApi = window.api
    window.api = {
      getAdminSetup: async () => ({
        texts: {},
        binaries: [],
        ready: {
          email: false,
          'chatbots/default': true,
          tickets: false,
          repayment: true,
          'about/AGENTS.md': false,
          'automations/AGENTS.md': true
        }
      })
    } as unknown as typeof window.api

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(view())
    })
    await act(async () => {
      await Promise.resolve()
    })

    function row(id: string) {
      return document.querySelector(`[data-admin-entry="${id}"]`)
    }

    for (const id of ['users', 'knowledge', 'conversations', 'statistics', 'providers']) {
      expect(row(id)?.querySelector('svg')).toBeNull()
    }

    expect(row('chatbots/default')?.querySelector('.lucide-circle-check')).not.toBeNull()
    expect(row('tickets')?.querySelector('.lucide-circle-check')).toBeNull()
    expect(row('tickets')?.querySelector('.lucide-circle')).not.toBeNull()
    expect(row('repayment')?.querySelector('.lucide-circle-check')).not.toBeNull()
    expect(row('about/AGENTS.md')?.querySelector('.lucide-circle')).not.toBeNull()
    expect(row('about/AGENTS.md')?.querySelector('.lucide-circle-check')).toBeNull()
    expect(row('automations/AGENTS.md')?.querySelector('.lucide-circle-check')).not.toBeNull()
    expect(document.querySelector('[data-slot="badge"]')).toBeNull()

    window.api = previousApi
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
