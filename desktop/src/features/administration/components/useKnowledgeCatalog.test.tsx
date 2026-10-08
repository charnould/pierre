import { afterEach, describe, expect, test } from 'bun:test'

import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { useKnowledgeCatalog } from './useKnowledgeCatalog'

const realSetInterval = window.setInterval
const realClearInterval = window.clearInterval

async function mount(status: 'queued' | 'running' | 'succeeded') {
  const delays: number[] = []
  window.setInterval = ((fn: TimerHandler, delay?: number) => {
    delays.push(delay ?? 0)
    return delays.length
  }) as typeof window.setInterval
  window.clearInterval = (() => {}) as typeof window.clearInterval
  window.api = {
    getAdminKnowledge: async () => ({
      data: { sources: [], lastBuild: { id: 'build-1', status } }
    }),
    getKnowledgeBuilds: async () => ({ data: { builds: [] } })
  } as unknown as typeof window.api

  function Probe() {
    useKnowledgeCatalog('https://pierre.test')
    return null
  }

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(<Probe />)
    await Promise.resolve()
  })
  await act(async () => root.unmount())
  host.remove()
  return delays
}

describe('useKnowledgeCatalog polling', () => {
  afterEach(() => {
    window.setInterval = realSetInterval
    window.clearInterval = realClearInterval
  })

  test('waits 30 seconds while the encyclopedia is idle', async () => {
    expect(await mount('succeeded')).toEqual([30_000, 30_000])
  })

  test('polls every 1.5 seconds while a build is running', async () => {
    expect(await mount('running')).toEqual([30_000, 1_500])
  })
})
