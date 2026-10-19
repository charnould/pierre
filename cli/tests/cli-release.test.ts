import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { updateCli } from '../src/commands/cli-release.ts'
import { tempRoot, testContext, writeExe } from './support.ts'

describe('remplacement du cli', () => {
  it('keeps a confirmed cli when its backup is still present', async () => {
    const root = await tempRoot('pierre-cli-confirmed-')
    await writeExe(join(root, 'pierre'), '#!/bin/sh\necho cli-0.9.1\n')
    await writeExe(join(root, 'pierre.previous'), '#!/bin/sh\necho cli-0.9.0\n')
    const ctx = testContext(root, { env: { PIERRE_CLI_UPDATE_TAG: 'cli-0.9.0' } })
    expect(await updateCli(ctx.ctx)).toBe(0)
    expect(await Bun.$`${join(root, 'pierre')} --version`.text()).toBe('cli-0.9.1\n')
    expect(existsSync(join(root, 'pierre.previous'))).toBe(false)
    expect(ctx.out()).not.toContain('Restauration')
  })

  it('restores the cli when the replacement does not match the expected tag', async () => {
    const root = await tempRoot('pierre-cli-target-')
    await writeExe(join(root, 'pierre'), '#!/bin/sh\necho cli-0.0.1\n')
    await writeExe(join(root, 'pierre.previous'), '#!/bin/sh\necho cli-0.9.0\n')
    await writeFile(join(root, 'pierre.target'), 'cli-0.9.1\n')
    const ctx = testContext(root, { env: { PIERRE_CLI_UPDATE_TAG: 'cli-0.9.0' } })
    expect(await updateCli(ctx.ctx)).toBe(0)
    expect(await Bun.$`${join(root, 'pierre')} --version`.text()).toBe('cli-0.9.0\n')
    expect(existsSync(join(root, 'pierre.previous'))).toBe(false)
    expect(existsSync(join(root, 'pierre.target'))).toBe(false)
    expect(ctx.out()).toContain('Restauration du cli interrompue.')
  })
})
