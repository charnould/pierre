import { describe, expect, it } from 'bun:test'

import { beginStream, cancelStream, endStream } from './lifecycle'

describe('stream lifecycle', () => {
  it('beginStream replaces prior controller for the same request id', () => {
    const registry = new Map()
    const first = beginStream(registry, 'req-1')
    const second = beginStream(registry, 'req-1')

    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
    expect(registry.size).toBe(1)
  })

  it('endStream removes only matching controller', () => {
    const registry = new Map()
    const controller = beginStream(registry, 'req-2')
    endStream(registry, 'req-2', controller)
    expect(registry.size).toBe(0)
  })

  it('cancelStream aborts and clears registry entry', () => {
    const registry = new Map()
    const controller = beginStream(registry, 'req-3')
    cancelStream(registry, 'req-3')
    expect(controller.signal.aborted).toBe(true)
    expect(registry.size).toBe(0)
  })
})
