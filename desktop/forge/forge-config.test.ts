import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import forgeConfig from '../forge.config.ts'

describe('forge config release invariants', () => {
  it('configures Squirrel for Windows auto-update', () => {
    const squirrel = forgeConfig.makers.find(
      (maker) => maker.name === '@electron-forge/maker-squirrel'
    )

    expect(squirrel?.platforms).toEqual(['win32'])
    expect(squirrel?.config?.name).toBe('pierre')
    expect(squirrel?.config?.setupExe).toBe('pierre-win32-setup.exe')
    expect(squirrel?.config?.noDelta).toBe(true)
  })

  it('keeps zip artifacts macOS-only', () => {
    const zip = forgeConfig.makers.find((maker) => maker.name === '@electron-forge/maker-zip')

    expect(zip?.platforms).toEqual(['darwin'])
    expect(zip?.platforms).not.toContain('win32')
  })

  it('publishes to the pierre GitHub repository', () => {
    const publisher = forgeConfig.publishers?.[0]

    expect(publisher?.name).toBe('@electron-forge/publisher-github')
    expect(publisher?.config?.repository).toEqual({
      owner: 'charnould',
      name: 'pierre'
    })
    expect(publisher?.config?.tagPrefix).toBe('')
    expect(publisher?.config?.draft).toBe(false)
    expect(publisher?.config?.prerelease).toBe(false)
  })

  it('externalises only what the packaged app can still resolve', async () => {
    // Forge ships no node_modules, so anything left external in the main bundle
    // is a MODULE_NOT_FOUND at startup. Only electron survives, being supplied
    // by the runtime itself.
    const prunesNodeModules = forgeConfig.packagerConfig.ignore.some((pattern) =>
      pattern.test('/node_modules/oxfmt/index.js')
    )
    expect(prunesNodeModules).toBe(true)

    const viteConfig = (await import('../electron.vite.config.ts')).default

    expect(viteConfig.main?.build?.rollupOptions?.external).toEqual(['electron'])
  })

  it('declares the desktop package directory for update.electronjs.org', () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')
    ) as { repository?: { directory?: string } }

    expect(pkg.repository?.directory).toBe('desktop')
  })
})
