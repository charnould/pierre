import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'
import { forwardRef, type ReactNode, useImperativeHandle } from 'react'

import type { ChatBoot } from '@/shared/types'

const releases: Array<{ url: string; convId: string }> = []

mock.module('@/shared/components/ModuleGate', () => ({
  ModuleGate: ({ children }: { children: ReactNode }) => children
}))

mock.module('@/features/chat/ChatPanel', () => ({
  ChatPanel: forwardRef(function MockChatPanel(_props, ref) {
    useImperativeHandle(ref, () => ({
      focus: () => {},
      stop: () => {},
      clearMessages: () => {},
      resetAfterAbortedStop: () => {}
    }))
    return <div data-testid="chat-panel" />
  })
}))

mock.module('@/shared/lib/release-conversation-vm', () => ({
  releaseConversationVm: (url: string, convId: string) => {
    releases.push({ url, convId })
  }
}))

const boot: ChatBoot = {
  convId: '00000000-0000-4000-8000-000000000002',
  configId: 'default',
  dataParam: '',
  greetings: [],
  disclaimer: '',
  examples: [],
  displayableConfigs: [],
  trace: 'none',
  attachments: false,
  embed: false
}

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  if (typeof globals.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/'
    })
    for (const key of [
      'document',
      'window',
      'navigator',
      'HTMLElement',
      'Element',
      'Node',
      'Event',
      'KeyboardEvent',
      'MouseEvent',
      'MutationObserver',
      'getComputedStyle',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]) {
      originalGlobals.set(key, globals[key])
    }
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.navigator = dom.window.navigator
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.KeyboardEvent = dom.window.KeyboardEvent
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
    globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
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

beforeEach(() => {
  releases.length = 0
})

describe('ChatView', () => {
  test('fills the canvas and keeps its conversation while hidden', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { ChatView } = await import('./ChatView')

    let bootCalls = 0
    const previousApi = window.api
    window.api = {
      getChatBoot: async () => {
        bootCalls += 1
        return boot
      }
    } as unknown as typeof window.api

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(<ChatView hidden={false} agentName="Pierre" url="https://pierre.test" />)
      await Promise.resolve()
      await Promise.resolve()
    })

    const panel = host.querySelector<HTMLElement>('[data-tab-panel]')
    expect(panel?.getAttribute('aria-label')).toBe('Discuter avec Pierre')
    expect(panel?.className).toContain('flex-1')
    expect(panel?.className).toContain('min-h-0')
    expect(panel?.className.split(/\s+/)).not.toContain('hidden')
    expect(panel?.className.split(/\s+/)).toContain('flex')
    expect(host.querySelector('[data-testid="chat-panel"]')).not.toBeNull()
    expect(host.querySelector('[data-chat-window]')).toBeNull()
    expect(host.querySelector('[data-chat-resize-direction]')).toBeNull()
    expect(host.querySelector('[aria-label^="Déplacer la conversation"]')).toBeNull()
    expect(host.querySelector('[aria-label="Fermer la conversation"]')).toBeNull()
    expect(bootCalls).toBe(1)
    expect(releases).toEqual([])

    const thread = host.querySelector('[data-testid="chat-panel"]')
    await act(async () => {
      root.render(<ChatView hidden agentName="Pierre" url="https://pierre.test" />)
    })
    expect(host.querySelector('[data-tab-panel]')?.className.split(/\s+/)).toContain('hidden')
    expect(host.querySelector('[data-testid="chat-panel"]')).toBe(thread)
    expect(releases).toEqual([])
    expect(bootCalls).toBe(1)

    await act(async () => root.unmount())
    expect(releases).toEqual([
      {
        url: 'https://pierre.test',
        convId: '00000000-0000-4000-8000-000000000002'
      }
    ])

    host.remove()
    window.api = previousApi
  })
})
