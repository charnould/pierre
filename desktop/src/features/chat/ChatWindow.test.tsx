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
  convId: '00000000-0000-4000-8000-000000000001',
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

describe('ChatWindow', () => {
  test('keeps one conversation while hidden and resized, then releases it on unmount', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { ChatWindow } = await import('./ChatWindow')

    let bootCalls = 0
    let closeCalls = 0
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
      root.render(
        <ChatWindow
          open
          agentName="Pierre"
          url="https://pierre.test"
          onClose={() => {
            closeCalls += 1
          }}
        />
      )
      await Promise.resolve()
      await Promise.resolve()
    })
    const frame = host.querySelector<HTMLElement>('[data-chat-window]')!
    frame.getBoundingClientRect = () =>
      ({
        bottom: 616,
        height: 576,
        left: 8,
        right: 392,
        top: 40,
        width: 384,
        x: 8,
        y: 40,
        toJSON: () => {}
      }) as DOMRect
    const panel = host.querySelector('[data-testid="chat-panel"]')
    expect(panel).not.toBeNull()
    expect(bootCalls).toBe(1)
    expect(frame.className).toContain('shadow-(--shadow-chat-window)')

    const moveHandle = host.querySelector<HTMLElement>('[aria-label^="Déplacer la conversation"]')
    await act(async () => {
      moveHandle?.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      )
    })
    expect(frame.style.left).toBe('24px')

    expect(host.querySelector('[aria-label="Agrandir la conversation"]')).toBeNull()
    expect(host.querySelector('[aria-label="Redimensionner la conversation"]')).toBeNull()
    expect(
      [...host.querySelectorAll('[data-chat-resize-direction]')].map((node) =>
        node.getAttribute('data-chat-resize-direction')
      )
    ).toEqual(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])
    await act(async () => {
      moveHandle?.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true
        })
      )
    })
    expect(frame.style.width).toBe('400px')

    const close = host.querySelector<HTMLButtonElement>('[aria-label="Fermer la conversation"]')
    await act(async () => close?.click())
    expect(closeCalls).toBe(1)
    expect(releases).toEqual([])
    expect(host.querySelector('[data-testid="chat-panel"]')).toBe(panel)

    await act(async () => {
      root.render(
        <ChatWindow
          open={false}
          agentName="Pierre"
          url="https://pierre.test"
          onClose={() => {
            closeCalls += 1
          }}
        />
      )
    })
    expect(host.querySelector('[data-chat-window]')?.hasAttribute('hidden')).toBe(true)
    expect(releases).toEqual([])

    await act(async () => {
      root.render(
        <ChatWindow
          open
          agentName="Pierre"
          url="https://pierre.test"
          onClose={() => {
            closeCalls += 1
          }}
        />
      )
    })
    expect(bootCalls).toBe(1)
    expect(host.querySelector('[data-testid="chat-panel"]')).toBe(panel)

    await act(async () => root.unmount())
    expect(releases).toEqual([
      {
        url: 'https://pierre.test',
        convId: '00000000-0000-4000-8000-000000000001'
      }
    ])

    host.remove()
    window.api = previousApi
  })

  test('clamps the whole reduced frame inside the viewport', async () => {
    const { clampChatWindowGeometry } = await import('./ChatWindow')
    const bounds = {
      minY: 40,
      viewportHeight: 800,
      viewportWidth: 1200
    }

    expect(
      clampChatWindowGeometry(
        { position: { x: -100, y: -100 }, size: { width: 100, height: 100 } },
        bounds
      )
    ).toEqual({ position: { x: 8, y: 40 }, size: { width: 320, height: 320 } })
    expect(
      clampChatWindowGeometry(
        { position: { x: 2000, y: 2000 }, size: { width: 500, height: 600 } },
        bounds
      )
    ).toEqual({ position: { x: 692, y: 192 }, size: { width: 500, height: 600 } })
    expect(
      clampChatWindowGeometry(
        { position: { x: 0, y: 0 }, size: { width: 2000, height: 2000 } },
        bounds
      )
    ).toEqual({ position: { x: 8, y: 40 }, size: { width: 1184, height: 752 } })
  })

  test('resizes from every invisible edge and corner while keeping the opposite edge fixed', async () => {
    const { resizeChatWindowGeometry } = await import('./ChatWindow')
    const geometry = {
      position: { x: 100, y: 100 },
      size: { width: 400, height: 400 }
    }
    const bounds = {
      minY: 40,
      viewportHeight: 800,
      viewportWidth: 1200
    }

    expect(resizeChatWindowGeometry(geometry, 'n', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 100, y: 130 },
      size: { width: 400, height: 370 }
    })
    expect(resizeChatWindowGeometry(geometry, 'ne', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 100, y: 130 },
      size: { width: 420, height: 370 }
    })
    expect(resizeChatWindowGeometry(geometry, 'e', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 100, y: 100 },
      size: { width: 420, height: 400 }
    })
    expect(resizeChatWindowGeometry(geometry, 'se', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 100, y: 100 },
      size: { width: 420, height: 430 }
    })
    expect(resizeChatWindowGeometry(geometry, 's', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 100, y: 100 },
      size: { width: 400, height: 430 }
    })
    expect(resizeChatWindowGeometry(geometry, 'sw', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 120, y: 100 },
      size: { width: 380, height: 430 }
    })
    expect(resizeChatWindowGeometry(geometry, 'w', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 120, y: 100 },
      size: { width: 380, height: 400 }
    })
    expect(resizeChatWindowGeometry(geometry, 'nw', { x: 20, y: 30 }, bounds)).toEqual({
      position: { x: 120, y: 130 },
      size: { width: 380, height: 370 }
    })
  })
})
