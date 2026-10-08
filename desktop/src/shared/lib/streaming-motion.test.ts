import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

const SRC = resolve(import.meta.dir, '../..')

describe('streaming motion CSS', () => {
  test('is shared by Electron and public chat without layout or filter animation', async () => {
    const [motion, desktop, publicChat] = await Promise.all([
      Bun.file(resolve(SRC, 'streaming-motion.css')).text(),
      Bun.file(resolve(SRC, 'globals.css')).text(),
      Bun.file(resolve(SRC, 'chat-web/theme.css')).text()
    ])

    expect(desktop).toContain("@import './streaming-motion.css'")
    expect(publicChat).toContain("@import '../streaming-motion.css'")
    expect(publicChat).toContain('--ease-pierre-out: cubic-bezier(0.23, 1, 0.32, 1)')
    expect(publicChat).not.toContain('@keyframes pierre-stream')

    expect(motion).toContain('@keyframes pierre-stream-reveal')
    expect(motion).toContain('opacity: 0')
    expect(motion).toContain('transform: translateY(2px)')
    expect(motion).toContain('var(--ease-pierre-out)')
    expect(motion).toContain('var(--pierre-stream-delay, 0ms)')
    expect(motion).not.toContain('filter:')
    expect(motion).not.toContain('display: none')
    expect(motion).not.toContain('display: revert')
  })
})
