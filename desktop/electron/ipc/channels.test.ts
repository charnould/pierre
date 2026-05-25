import { describe, expect, it } from 'bun:test'

import { IpcChannel } from './channels'

describe('IpcChannel.system app update channels', () => {
  it('registers stable wire names for version and update check', () => {
    expect(IpcChannel.system.getAppVersion).toBe('get-app-version')
    expect(IpcChannel.system.checkForAppUpdates).toBe('check-for-app-updates')
  })

  it('keeps app update channels distinct from other system channels', () => {
    const systemChannels = Object.values(IpcChannel.system)
    expect(new Set(systemChannels).size).toBe(systemChannels.length)
    expect(systemChannels).toContain('get-app-version')
    expect(systemChannels).toContain('check-for-app-updates')
  })
})
