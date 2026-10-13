import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { recordChecksum, writeExe } from './support.ts'

describe('bootstrap', () => {
  const script = join(import.meta.dir, '../scripts/install.sh')

  it('refuses a non-root or non-linux machine before downloading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-boot-'))
    try {
      const bin = join(root, 'bin')
      await mkdir(bin)
      await writeExe(
        join(bin, 'uname'),
        '#!/bin/sh\nif [ "$1" = "-s" ]; then echo Linux; else echo x86_64; fi\n'
      )
      await writeExe(join(bin, 'id'), '#!/bin/sh\necho 1000\n')
      const proc = Bun.spawn(['sh', script], {
        env: { PATH: `${bin}:/usr/bin:/bin`, HOME: root, TMPDIR: root },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const stderr = await new Response(proc.stderr).text()
      expect(await proc.exited).toBe(1)
      expect(stderr).toContain('Il faut être root.')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('installs a checked local binary and shows the status', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-boot-'))
    try {
      const assets = join(root, 'assets')
      const destDir = join(root, 'dest')
      await mkdir(assets)
      await mkdir(destDir)
      const binary = join(assets, 'pierre-cli-linux-x64')
      await writeExe(binary, '#!/bin/sh\necho "$@"; echo installed\n')
      await recordChecksum(assets, 'pierre-cli-linux-x64')
      const bin = join(root, 'bin')
      await mkdir(bin)
      await writeExe(
        join(bin, 'uname'),
        '#!/bin/sh\nif [ "$1" = "-s" ]; then echo Linux; else echo x86_64; fi\n'
      )
      await writeExe(join(bin, 'id'), '#!/bin/sh\necho 0\n')
      const dest = join(destDir, 'pierre')
      const proc = Bun.spawn(['sh', script], {
        env: {
          PATH: `${bin}:/usr/bin:/bin:/usr/sbin`,
          HOME: root,
          TMPDIR: root,
          PIERRE_CLI_ASSET_DIR: assets,
          PIERRE_CLI_DEST: dest
        },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ])
      expect(code).toBe(0)
      expect(stderr).toBe('')
      expect(stdout).toBe('\ninstalled\n')
      expect(existsSync(dest)).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('can verify the published cli without starting the server installation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-boot-'))
    try {
      const assets = join(root, 'assets')
      const destDir = join(root, 'dest')
      const bin = join(root, 'bin')
      await Promise.all([mkdir(assets), mkdir(destDir), mkdir(bin)])
      const binary = join(assets, 'pierre-cli-linux-x64')
      await writeExe(
        binary,
        '#!/bin/sh\n[ "$1" = "--version" ] || exit 99\nprintf "cli-0.9.1\\n"\n'
      )
      await recordChecksum(assets, 'pierre-cli-linux-x64')
      await writeExe(
        join(bin, 'uname'),
        '#!/bin/sh\nif [ "$1" = "-s" ]; then echo Linux; else echo x86_64; fi\n'
      )
      await writeExe(join(bin, 'id'), '#!/bin/sh\necho 0\n')
      const dest = join(destDir, 'pierre')
      const proc = Bun.spawn(['sh', script], {
        env: {
          PATH: `${bin}:/usr/bin:/bin:/usr/sbin`,
          HOME: root,
          TMPDIR: root,
          PIERRE_BOOTSTRAP_ONLY: '1',
          PIERRE_CLI_ASSET_DIR: assets,
          PIERRE_CLI_DEST: dest
        },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ])
      expect(code).toBe(0)
      expect(stderr).toBe('')
      expect(stdout).toBe('cli-0.9.1\n')
      expect(existsSync(dest)).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
