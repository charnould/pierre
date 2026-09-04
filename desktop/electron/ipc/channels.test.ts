import { describe, expect, it } from 'bun:test'

import {
  AuthWindowLayoutSwapEvent,
  FoundInPageEvent,
  IpcChannel,
  MascotLookEvent,
  MascotOpenNotificationsEvent,
  MascotUnreadCountEvent
} from './channels'

describe('IpcChannel.system app update channels', () => {
  it('registers stable wire names for version and update check', () => {
    expect(IpcChannel.system.getAppVersion).toBe('get-app-version')
    expect(IpcChannel.system.checkForAppUpdates).toBe('check-for-app-updates')
    expect(IpcChannel.system.openTicketExternalApplication).toBe('open-ticket-external-application')
    expect(IpcChannel.system.setAuthWindowLayout).toBe('set-auth-window-layout')
    expect(IpcChannel.system.authWindowLayoutSwapAck).toBe('auth-window-layout-swap-ack')
    expect(AuthWindowLayoutSwapEvent).toBe('auth-window-layout-swap')
  })

  it('keeps app update channels distinct from other system channels', () => {
    const systemChannels = Object.values(IpcChannel.system)
    expect(new Set(systemChannels).size).toBe(systemChannels.length)
    expect(systemChannels).toContain('get-app-version')
    expect(systemChannels).toContain('check-for-app-updates')
  })
})

describe('IpcChannel.system find-in-page channels', () => {
  it('registers stable wire names for find in page', () => {
    expect(IpcChannel.system.findInPage).toBe('find-in-page')
    expect(IpcChannel.system.stopFindInPage).toBe('stop-find-in-page')
    expect(FoundInPageEvent).toBe('found-in-page')
  })
})

describe('IpcChannel.datastore', () => {
  it('registers stable wire name for datastore tables', () => {
    expect(IpcChannel.datastore.tables).toBe('get-datastore-tables')
  })
})

describe('IpcChannel.bulkOperations', () => {
  it('registers stable wire names for bulk operations', () => {
    expect(IpcChannel.bulkOperations.list).toBe('get-bulk-operations')
    expect(IpcChannel.bulkOperations.execute).toBe('execute-bulk-operation')
    expect(IpcChannel.bulkOperations.reports).toBe('get-bulk-operation-reports')
    expect(IpcChannel.bulkOperations.previewQuery).toBe('preview-bulk-operation-query')
    expect(IpcChannel.bulkOperations.previewMessage).toBe('preview-bulk-operation-message')
  })

  it('keeps bulk operation channels distinct', () => {
    const channels = Object.values(IpcChannel.bulkOperations)
    expect(new Set(channels).size).toBe(channels.length)
  })
})

describe('IpcChannel.activities', () => {
  it('registers stable wire names for activities API', () => {
    expect(IpcChannel.activities.list).toBe('get-activities')
    expect(IpcChannel.activities.create).toBe('create-activity')
    expect(IpcChannel.activities.recordExternalCommunication).toBe('record-external-communication')
    expect(IpcChannel.activities.sendCommunication).toBe('send-communication')
    expect(IpcChannel.activities.patch).toBe('patch-activity')
    expect(IpcChannel.activities.delete).toBe('delete-activity')
  })

  it('keeps activity channels distinct', () => {
    const channels = Object.values(IpcChannel.activities)
    expect(new Set(channels).size).toBe(channels.length)
  })
})

describe('IpcChannel.mascot', () => {
  it('registers stable wire names for the desktop mascot', () => {
    expect(IpcChannel.mascot.setUnreadCount).toBe('mascot-set-unread-count')
    expect(IpcChannel.mascot.activate).toBe('mascot-activate')
    expect(IpcChannel.mascot.setBounds).toBe('mascot-set-bounds')
    expect(IpcChannel.mascot.setEnabled).toBe('mascot-set-enabled')
    expect(IpcChannel.mascot.setSize).toBe('mascot-set-size')
    expect(IpcChannel.mascot.setLook).toBe('mascot-set-look')
    expect(IpcChannel.mascot.showMenu).toBe('mascot-show-menu')
    expect(IpcChannel.mascot.syncVisibility).toBe('mascot-sync-visibility')
  })

  it('keeps mascot invoke channels distinct', () => {
    const channels = Object.values(IpcChannel.mascot)
    expect(new Set(channels).size).toBe(channels.length)
  })

  it('registers stable mascot event channel names', () => {
    expect(MascotUnreadCountEvent).toBe('mascot:unread-count')
    expect(MascotLookEvent).toBe('mascot:look')
    expect(MascotOpenNotificationsEvent).toBe('mascot:open-notifications')
  })
})
