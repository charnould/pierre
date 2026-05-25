import { describe, expect, it } from 'bun:test'

import { createWriteQueue } from './write-queue'

describe('createWriteQueue', () => {
  it('runs tasks sequentially, not in parallel', async () => {
    const queue = createWriteQueue()
    const order: number[] = []

    const first = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 30))
      order.push(1)
      return 'a'
    })

    const second = queue.enqueue(async () => {
      order.push(2)
      return 'b'
    })

    expect(await first).toBe('a')
    expect(await second).toBe('b')
    expect(order).toEqual([1, 2])
  })

  it('continues after a rejected task', async () => {
    const queue = createWriteQueue()

    await expect(
      queue.enqueue(async () => {
        throw new Error('fail')
      })
    ).rejects.toThrow('fail')

    const value = await queue.enqueue(() => 42)
    expect(value).toBe(42)
  })
})
