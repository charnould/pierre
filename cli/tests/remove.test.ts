import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { remove } from '../src/commands/remove.ts'
import { configuredText, tempRoot, testContext } from './support.ts'

async function readyCaddy(root: string) {
  await writeFile(join(root, 'caddy-key.gpg'), 'key')
  await writeFile(join(root, 'caddy-owned'), 'PIERRE\n')
  await writeFile(join(root, 'caddy-source.list'), 'source')
}

describe('désinstallation', () => {
  it('deletes the isolated smolvm home without touching shared caches', async () => {
    const root = await tempRoot('pierre-remove-')
    await readyCaddy(root)
    const cache = join(root, '.cache', 'smolvm')
    const smolvmHome = join(root, 'smolvm-home')
    await mkdir(cache, { recursive: true })
    await mkdir(smolvmHome, { recursive: true })
    await writeFile(join(cache, 'leftover'), 'x')
    await writeFile(join(smolvmHome, 'machine'), 'x')
    await writeFile(join(root, 'Caddyfile'), '# Managed by PIERRE\n')
    await writeFile(join(root, 'pierre.env'), configuredText())
    await writeFile(join(root, 'pierre.service'), 'unit\n')
    const ctx = testContext(root, { canPrompt: true, readLine: async () => 'oui' })

    expect(await remove(ctx.ctx)).toBe(0)
    expect(existsSync(join(cache, 'leftover'))).toBe(true)
    expect(existsSync(smolvmHome)).toBe(false)
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(existsSync(join(root, 'pierre.service'))).toBe(false)
    expect(existsSync(join(root, 'Caddyfile'))).toBe(false)
  })

  it('lists and deletes machines only inside the Pierre home', async () => {
    const root = await tempRoot('pierre-remove-machines-')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const homes: Array<string | undefined> = []
    const dataDirs: Array<string | undefined> = []
    const ctx = testContext(root, {
      canPrompt: true,
      readLine: async () => 'oui',
      commandExists: (name) => name === 'smolvm',
      start: (_command, args, options) => {
        if (args[0] === 'machine') {
          homes.push(options?.env?.['HOME'])
          dataDirs.push(options?.env?.['XDG_DATA_HOME'])
        }
        return {
          finished: Promise.resolve({
            code: 0,
            stdout: args[1] === 'ls' ? '[{"name":"conversation"}]' : '',
            stderr: ''
          }),
          kill: () => undefined
        }
      }
    })

    expect(await remove(ctx.ctx)).toBe(0)
    expect(homes).toEqual([
      join(root, 'smolvm-home'),
      join(root, 'smolvm-home'),
      join(root, 'smolvm-home')
    ])
    expect(dataDirs).toEqual([
      join(root, 'smolvm-home', '.local/share'),
      join(root, 'smolvm-home', '.local/share'),
      join(root, 'smolvm-home', '.local/share')
    ])
  })

  it('removes an unowned Caddy installation without purging generic packages', async () => {
    const root = await tempRoot('pierre-remove-caddy-')
    const caddy = join(root, 'Caddyfile')
    await writeFile(caddy, 'existing.example.org {\n\trespond "existing"\n}\n')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, {
      canPrompt: true,
      readLine: async () => 'oui',
      commandExists: (name) => name === 'caddy'
    })

    expect(await remove(ctx.ctx)).toBe(0)
    expect(existsSync(caddy)).toBe(false)
    expect(
      ctx.calls.some((call) => call.command === 'systemctl' && call.args.includes('caddy'))
    ).toBe(true)
    expect(
      ctx.calls.some((call) => call.command === 'systemctl' && call.args.includes('pierre'))
    ).toBe(false)
    const purge = ctx.calls.find((call) => call.command === 'apt-get' && call.args[0] === 'purge')
    expect(purge?.args).toEqual(['purge', '-y', 'caddy'])
  })

  it('does not delete files when services cannot be stopped', async () => {
    const root = await tempRoot('pierre-remove-failed-')
    await writeFile(join(root, 'pierre.env'), configuredText())
    await writeFile(join(root, 'pierre.service'), 'unit\n')
    const ctx = testContext(root, {
      canPrompt: true,
      readLine: async () => 'oui',
      start: () => ({
        finished: Promise.resolve({ code: 1, stdout: '', stderr: 'stop failed\n' }),
        kill: () => undefined
      })
    })

    expect(await remove(ctx.ctx)).toBe(1)
    expect(existsSync(join(root, 'pierre.env'))).toBe(true)
  })
})
