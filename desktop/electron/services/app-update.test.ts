import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { triggerAppUpdateCheck } from './app-update'

describe('triggerAppUpdateCheck', () => {
  it('invokes checkForUpdates and returns true on packaged Windows', () => {
    let called = false
    const result = triggerAppUpdateCheck('win32', true, () => {
      called = true
    })

    expect(result).toBe(true)
    expect(called).toBe(true)
  })

  it('does not invoke checkForUpdates in dev on Windows', () => {
    let called = false
    const result = triggerAppUpdateCheck('win32', false, () => {
      called = true
    })

    expect(result).toBe(false)
    expect(called).toBe(false)
  })

  it('does not invoke checkForUpdates on packaged macOS', () => {
    let called = false
    const result = triggerAppUpdateCheck('darwin', true, () => {
      called = true
    })

    expect(result).toBe(false)
    expect(called).toBe(false)
  })

  it('does not invoke checkForUpdates on packaged Linux', () => {
    let called = false
    const result = triggerAppUpdateCheck('linux', true, () => {
      called = true
    })

    expect(result).toBe(false)
    expect(called).toBe(false)
  })

  it('does not invoke checkForUpdates on other platforms', () => {
    for (const platform of ['aix', 'freebsd', 'openbsd'] as NodeJS.Platform[]) {
      let called = false
      const result = triggerAppUpdateCheck(platform, true, () => {
        called = true
      })
      expect(result).toBe(false)
      expect(called).toBe(false)
    }
  })

  it('returns false without throwing when checkForUpdates throws', () => {
    expect(() =>
      triggerAppUpdateCheck('win32', true, () => {
        throw new Error('updater unavailable')
      })
    ).toThrow('updater unavailable')
  })

  it('ignores the return value of checkForUpdates', () => {
    const result = triggerAppUpdateCheck('win32', true, () => null)
    expect(result).toBe(true)
  })
})

describe('desktop package version', () => {
  it('uses a semver-like version in package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8')
    ) as { version?: string }

    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/)
  })
})
