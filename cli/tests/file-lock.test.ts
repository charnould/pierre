import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

import { acquireFileLock } from '../src/lib/file-lock'
import { tempRoot } from './support'

describe('kernel update lock', () => {
  it('is exclusive and released with its file descriptor', async () => {
    const root = await tempRoot('pierre-lock-')
    const path = join(root, 'update.lock')
    const first = acquireFileLock(path)
    expect(first).toBeFunction()
    expect(acquireFileLock(path)).toBeNull()
    first!()
    const next = acquireFileLock(path)
    expect(next).toBeFunction()
    next!()
  })
})
