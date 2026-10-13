import { describe, expect, it } from 'bun:test'
import { readlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ensureSmolvm } from '../src/lib/smolvm-runtime.ts'
import { tempRoot, testContext } from './support.ts'

describe('smolvm runtime activation', () => {
  it('activates the pinned runtime', async () => {
    const root = await tempRoot('pierre-smolvm-')
    const ctx = testContext(root)

    await ensureSmolvm(ctx.ctx)

    expect(await readlink(join(root, 'smolvm-runtime', 'current'))).toBe(
      join(root, 'smolvm-runtime', 'releases', '1.24.0')
    )
    expect(await readlink(join(root, 'smolvm'))).toBe(
      join(root, 'smolvm-runtime', 'current', 'smolvm')
    )
  })

  it('does not accept a corrupted cached runtime', async () => {
    const root = await tempRoot('pierre-smolvm-')
    const ctx = testContext(root)
    await writeFile(
      join(root, 'smolvm-runtime', 'releases', '1.24.0', 'smolvm'),
      '#!/bin/sh\necho broken\n'
    )

    await expect(ensureSmolvm(ctx.ctx)).rejects.toThrow('Runtime smolvm 1.24.0 invalide')
  })
})
