import { describe, expect, it } from 'bun:test'

import { UPDATER_REPO, shouldEnableAutoUpdater, updaterOptions } from './auto-updater'

describe('shouldEnableAutoUpdater', () => {
  it('enables on packaged Windows builds', () => {
    expect(shouldEnableAutoUpdater('win32', true)).toBe(true)
  })

  it('disables in dev on Windows', () => {
    expect(shouldEnableAutoUpdater('win32', false)).toBe(false)
  })

  it('disables on packaged macOS builds', () => {
    expect(shouldEnableAutoUpdater('darwin', true)).toBe(false)
  })

  it('disables on packaged Linux builds', () => {
    expect(shouldEnableAutoUpdater('linux', true)).toBe(false)
  })

  it('requires both packaged build and win32 platform', () => {
    expect(shouldEnableAutoUpdater('darwin', false)).toBe(false)
    expect(shouldEnableAutoUpdater('linux', false)).toBe(false)
  })
})

describe('updaterOptions', () => {
  it('points at the pierre GitHub repo', () => {
    expect(updaterOptions().repo).toBe(UPDATER_REPO)
    expect(updaterOptions().updateInterval).toBe('1 hour')
  })
})
