import { describe, expect, spyOn, test } from 'bun:test'

import { type ProcessedPiAttachments, processUploadedAttachments } from '../../utils/ai-attachments'
import { setDatastoreRoot, testDatastoreRoot } from '../../utils/paths'
import type { PierreInstance } from '../../utils/smolvm'
import {
  getConversationUploadsPath,
  getConversationWorkspacePath,
  getKnowledgePath,
  getWorkspacesPath
} from '../../utils/smolvm'
import {
  acquireVm,
  type AcquireVmDependencies,
  conversationReservationCount,
  destroyVm,
  invalidateAllVms,
  releaseVm,
  reserveConversation,
  tryReserveConversation
} from '../../utils/vm-registry'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'

describe('VM registry conversation reservations', () => {
  test('reserves resident VM capacity before staging attachments', () => {
    const previous = Bun.env['SMOLVM_MAX_ACTIVE']
    Bun.env['SMOLVM_MAX_ACTIVE'] = '1'
    const release = tryReserveConversation('capacity-1')
    try {
      expect(release).toBeFunction()
      expect(tryReserveConversation('capacity-2')).toBeNull()
    } finally {
      release?.()
      if (previous === undefined) delete Bun.env['SMOLVM_MAX_ACTIVE']
      else Bun.env['SMOLVM_MAX_ACTIVE'] = previous
    }
    const next = tryReserveConversation('capacity-2')
    expect(next).toBeFunction()
    next?.()
  })

  test('replaces a mismatched VM immediately without deleting reserved staging', async () => {
    const root = testDatastoreRoot(`vm-reservation-${Bun.randomUUIDv7()}`)
    setDatastoreRoot(root)
    const events: string[] = []
    const disposed: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    let staged: ProcessedPiAttachments | undefined

    const dependencies: AcquireVmDependencies = {
      takePoolInstance: () => undefined,
      createInstance: async (convId, configId) => {
        events.push(`create:${configId}`)
        return {
          name: convId,
          knowledgePath: getKnowledgePath(configId),
          workspacePath: getConversationWorkspacePath(configId, convId),
          fromPool: false,
          piProcess: {} as never
        }
      },
      startPoolInstance: async () => {
        throw new Error('pool should not be used')
      },
      destroyInstance: async (instance: PierreInstance) => {
        events.push(`destroy:${instance.knowledgePath.split('/').at(-1)}`)
      },
      createClient: (instance) =>
        ({
          waitForReady: async () => {},
          dispose: () => disposed.push(instance.knowledgePath.split('/').at(-1) ?? ''),
          sendCommand: async () => ({}),
          sendRaw: () => {},
          onEvent: () => () => {},
          onClose: () => () => {}
        }) as never
    }

    let releaseFirst = () => {}
    let releaseSecond = () => {}
    try {
      await acquireVm(CONV_ID, 'old-config', dependencies)
      releaseVm(CONV_ID)
      releaseFirst = reserveConversation(CONV_ID)
      releaseSecond = reserveConversation(CONV_ID)

      staged = await processUploadedAttachments(
        [new File(['keep'], 'request.txt', { type: 'text/plain' })],
        getWorkspacesPath('new-config'),
        'request',
        CONV_ID
      )
      const stagingPath = getConversationUploadsPath('new-config', CONV_ID)
      const inodeBefore = (await Bun.file(stagingPath).stat()).ino

      await destroyVm(CONV_ID)
      await acquireVm(CONV_ID, 'new-config', dependencies)

      expect(events).toEqual(['create:old-config', 'destroy:old-config', 'create:new-config'])
      expect(disposed).toEqual(['old-config'])
      expect(await Bun.file(`${stagingPath}/request.txt`).text()).toBe('keep')
      expect((await Bun.file(stagingPath).stat()).ino).toBe(inodeBefore)

      releaseFirst()
      expect(conversationReservationCount(CONV_ID)).toBe(1)
      expect(events).not.toContain('destroy:new-config')
      releaseSecond()
      expect(conversationReservationCount(CONV_ID)).toBe(0)
      expect(events).not.toContain('destroy:new-config')
      expect((await Bun.file(stagingPath).stat()).ino).toBe(inodeBefore)

      staged.claim()
      releaseVm(CONV_ID)
      await destroyVm(CONV_ID)
      expect(events).toContain('destroy:new-config')
      expect(await Bun.file(stagingPath).exists()).toBe(false)
    } finally {
      releaseSecond()
      releaseFirst()
      await staged?.rollback()
      await destroyVm(CONV_ID)
      await Bun.spawn(['rm', '-rf', root]).exited
      logSpy.mockRestore()
      warnSpy.mockRestore()
      setDatastoreRoot(null)
    }
  })

  test('invalidates idle VMs and defers active work', async () => {
    const root = testDatastoreRoot(`vm-invalidation-${Bun.randomUUIDv7()}`)
    setDatastoreRoot(root)
    const destroyed: string[] = []
    const dependencies: AcquireVmDependencies = {
      takePoolInstance: () => undefined,
      createInstance: async (convId, configId) => ({
        name: convId,
        knowledgePath: getKnowledgePath(configId),
        workspacePath: getConversationWorkspacePath(configId, convId),
        fromPool: false,
        piProcess: {} as never
      }),
      startPoolInstance: async () => {
        throw new Error('pool should not be used')
      },
      destroyInstance: async (instance) => {
        destroyed.push(instance.name)
      },
      createClient: () =>
        ({
          waitForReady: async () => {},
          dispose: () => {},
          sendCommand: async () => ({}),
          sendRaw: () => {},
          onEvent: () => () => {},
          onClose: () => () => {}
        }) as never
    }
    const idle = '0198f1a0-7b6c-7000-8000-000000000002'
    const active = '0198f1a0-7b6c-7000-8000-000000000003'

    try {
      await acquireVm(idle, 'default', dependencies)
      releaseVm(idle)
      await acquireVm(active, 'default', dependencies)

      await invalidateAllVms()
      expect(destroyed).toEqual([idle])

      releaseVm(active)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(destroyed).toEqual([idle, active])
    } finally {
      await destroyVm(idle)
      await destroyVm(active)
      await Bun.spawn(['rm', '-rf', root]).exited
      setDatastoreRoot(null)
    }
  })
})
