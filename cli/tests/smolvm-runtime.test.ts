import { describe, expect, it } from 'bun:test'
import { mkdir, readlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  activateSmolvm,
  currentSmolvmState,
  prepareSmolvm,
  restoreSmolvm
} from '../src/lib/smolvm-runtime'
import { tempRoot, testContext, writeExe } from './support'

describe('smolvm runtime activation', () => {
  it('prepares the pinned runtime without changing the active symlink', async () => {
    const root = await tempRoot('pierre-smolvm-')
    const ctx = testContext(root)
    const before = currentSmolvmState(ctx.ctx)
    const prepared = await prepareSmolvm(ctx.ctx)

    expect(prepared.previous).toEqual(before)
    expect(await readlink(join(root, 'smolvm-runtime', 'current'))).toBe(
      join(root, 'smolvm-runtime', 'releases', '1.24.0')
    )
  })

  it('switches and restores the runtime with one symlink transition', async () => {
    const root = await tempRoot('pierre-smolvm-')
    const ctx = testContext(root)
    const previous = currentSmolvmState(ctx.ctx)
    const candidate = join(root, 'smolvm-runtime', 'releases', '1.25.0')
    await mkdir(candidate)
    await writeExe(join(candidate, 'smolvm'), '#!/bin/sh\necho "smolvm 1.25.0"\n')

    activateSmolvm(ctx.ctx, candidate)
    expect(await readlink(join(root, 'smolvm-runtime', 'current'))).toBe(candidate)
    restoreSmolvm(ctx.ctx, previous)
    expect(await readlink(join(root, 'smolvm-runtime', 'current'))).toBe(
      join(root, 'smolvm-runtime', 'releases', '1.24.0')
    )
  })

  it('does not accept a corrupted cached runtime', async () => {
    const root = await tempRoot('pierre-smolvm-')
    const ctx = testContext(root)
    await writeFile(
      join(root, 'smolvm-runtime', 'releases', '1.24.0', 'smolvm'),
      '#!/bin/sh\necho broken\n'
    )

    await expect(prepareSmolvm(ctx.ctx)).rejects.toThrow('Runtime smolvm 1.24.0 invalide')
  })
})
