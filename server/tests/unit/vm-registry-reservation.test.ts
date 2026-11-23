import { describe, expect, spyOn, test } from 'bun:test'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { type ProcessedPiAttachments, processUploadedAttachments } from '../../utils/ai-attachments'
import { setDatastoreRoot, testDatastoreRoot } from '../../utils/paths'
import type { HotPoolVm } from '../../utils/smolvm'
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

function fakeProcess() {
  return { kill() {} } as never
}

function fakeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    waitForReady: async () => {},
    dispose: () => {},
    sendCommand: async () => ({}),
    sendRaw: () => {},
    onEvent: () => () => {},
    onClose: () => () => {},
    ...overrides
  } as never
}

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
      takePoolVm: () => undefined,
      createInstance: async (convId, configId) => {
        events.push(`create:${configId}`)
        return {
          name: `${convId}:${configId}`,
          knowledgePath: getKnowledgePath(configId),
          workspacePath: getConversationWorkspacePath(configId, convId),
          fromPool: false,
          piProcess: fakeProcess(),
          thinkingLevel: 'medium'
        }
      },
      activateHotPoolVm: async () => {
        throw new Error('pool should not be used')
      },
      recyclePoolVm: async () => {},
      destroyColdMachine: async (name) => {
        events.push(`destroy:${name.split(':').at(-1)}`)
      },
      createClient: (instance) =>
        fakeClient({
          dispose: () => disposed.push(instance.knowledgePath.split('/').at(-1) ?? '')
        })
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

  test('invalidates idle VMs, defers active work, and refreshes pool providers', async () => {
    const root = testDatastoreRoot(`vm-invalidation-${Bun.randomUUIDv7()}`)
    setDatastoreRoot(root)
    const destroyed: string[] = []
    let refreshed = 0
    const dependencies: AcquireVmDependencies = {
      takePoolVm: () => undefined,
      createInstance: async (convId, configId) => ({
        name: convId,
        knowledgePath: getKnowledgePath(configId),
        workspacePath: getConversationWorkspacePath(configId, convId),
        fromPool: false,
        piProcess: fakeProcess(),
        thinkingLevel: 'medium'
      }),
      activateHotPoolVm: async () => {
        throw new Error('pool should not be used')
      },
      recyclePoolVm: async () => {},
      destroyColdMachine: async (name) => {
        destroyed.push(name)
      },
      createClient: () => fakeClient()
    }
    const idle = '0198f1a0-7b6c-7000-8000-000000000002'
    const active = '0198f1a0-7b6c-7000-8000-000000000003'

    try {
      await acquireVm(idle, 'default', dependencies)
      releaseVm(idle)
      await acquireVm(active, 'default', dependencies)

      await invalidateAllVms(async () => {
        refreshed += 1
      })
      expect(destroyed).toEqual([idle])
      expect(refreshed).toBe(1)

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

  test('acquires hot pool VM with zero RPC and incrementally syncs turn-2 uploads into slotWorkPath', async () => {
    const root = testDatastoreRoot(`vm-hot-pool-${Bun.randomUUIDv7()}`)
    setDatastoreRoot(root)
    const slotKnowledgePath = join(root, 'workspaces', '_pool', 'pierre-pool-0', 'knowledge')
    const slotWorkPath = join(root, 'workspaces', '_pool', 'pierre-pool-0', 'work')
    mkdirSync(slotKnowledgePath, { recursive: true })
    mkdirSync(slotWorkPath, { recursive: true })

    let waitForReadyCalls = 0
    const commandsSent: string[] = []
    const recycled: string[] = []
    const hotClient = fakeClient({
      waitForReady: async () => {
        waitForReadyCalls += 1
      },
      sendCommand: async (cmd: { type: string }) => {
        commandsSent.push(cmd.type)
        return {}
      }
    })
    let nextSlot: HotPoolVm | undefined = {
      name: 'pierre-pool-0',
      slotKnowledgePath,
      slotWorkPath,
      piProcess: fakeProcess(),
      piClient: hotClient,
      providerFingerprint: 'fp-hot',
      thinkingLevel: 'high',
      detachWatcher: () => {}
    }

    const dependencies: AcquireVmDependencies = {
      takePoolVm: () => {
        const current = nextSlot
        nextSlot = undefined
        return current
      },
      activateHotPoolVm: async (slot, knowledgePath, workspacePath) => ({
        name: slot.name,
        knowledgePath,
        workspacePath,
        slotWorkPath: slot.slotWorkPath,
        fromPool: true,
        piProcess: slot.piProcess!,
        piClient: slot.piClient!,
        thinkingLevel: slot.thinkingLevel ?? 'medium'
      }),
      createInstance: async () => {
        throw new Error('cold creation should not run on hot hit')
      },
      recyclePoolVm: async (name) => {
        recycled.push(name)
      },
      destroyColdMachine: async () => {
        throw new Error('cold destroy should not run for pool VM')
      },
      createClient: () => {
        throw new Error('createClient should not run when hot piClient is ready')
      }
    }

    const convId = '0198f1a0-7b6c-7000-8000-000000000020'
    try {
      const turn1 = await acquireVm(convId, 'default', dependencies)
      expect(turn1.piClient).toBe(hotClient)
      expect(turn1.thinkingLevel).toBe('high')
      expect(waitForReadyCalls).toBe(0)
      expect(commandsSent).toEqual([])
      releaseVm(convId)

      // Stage a turn-2 upload in canonical conversation uploads dir
      const uploadsDir = getConversationUploadsPath('default', convId)
      mkdirSync(uploadsDir, { recursive: true })
      const turn2File = join(uploadsDir, 'facture.pdf')
      writeFileSync(turn2File, '%PDF-turn-2')
      const canonicalInode = statSync(turn2File).ino

      const turn2 = await acquireVm(convId, 'default', dependencies)
      expect(turn2).toBe(turn1)
      const slotUploadedFile = join(slotWorkPath, '_uploads', 'facture.pdf')
      expect(statSync(slotUploadedFile).ino).toBe(canonicalInode)

      releaseVm(convId)
      await destroyVm(convId)
      expect(recycled).toEqual(['pierre-pool-0'])
    } finally {
      await destroyVm(convId)
      await Bun.spawn(['rm', '-rf', root]).exited
      setDatastoreRoot(null)
    }
  })

  test('passes autonomous=true for automation profiles and false for chat', async () => {
    const root = testDatastoreRoot(`vm-autonomous-${Bun.randomUUIDv7()}`)
    setDatastoreRoot(root)
    const calls: Array<{ kind: 'pool' | 'create'; autonomous: boolean | undefined }> = []
    let poolNext: HotPoolVm | undefined = {
      name: 'pierre-pool-1',
      slotKnowledgePath: join(root, 'k'),
      slotWorkPath: join(root, 'w'),
      piProcess: fakeProcess(),
      piClient: fakeClient(),
      providerFingerprint: 'fp',
      thinkingLevel: 'medium',
      detachWatcher: () => {}
    }
    const dependencies: AcquireVmDependencies = {
      takePoolVm: () => {
        const current = poolNext
        poolNext = undefined
        return current
      },
      activateHotPoolVm: async (slot, knowledgePath, workspacePath, autonomous) => {
        calls.push({ kind: 'pool', autonomous })
        return {
          name: slot.name,
          knowledgePath,
          workspacePath,
          slotWorkPath: slot.slotWorkPath,
          fromPool: true,
          piProcess: fakeProcess(),
          piClient: fakeClient(),
          thinkingLevel: 'medium'
        }
      },
      createInstance: async (convId, configId, autonomous) => {
        calls.push({ kind: 'create', autonomous })
        return {
          name: convId,
          knowledgePath: getKnowledgePath(configId),
          workspacePath: getConversationWorkspacePath(configId, convId),
          fromPool: false,
          piProcess: fakeProcess(),
          thinkingLevel: 'medium'
        }
      },
      recyclePoolVm: async () => {},
      destroyColdMachine: async () => {},
      createClient: () => fakeClient()
    }
    const reportConv = '0198f1a0-7b6c-7000-8000-000000000010'
    const chatConv = '0198f1a0-7b6c-7000-8000-000000000011'

    try {
      await acquireVm(reportConv, 'report', dependencies)
      releaseVm(reportConv)
      await acquireVm(chatConv, 'default', dependencies)
      releaseVm(chatConv)
      expect(calls).toEqual([
        { kind: 'pool', autonomous: true },
        { kind: 'create', autonomous: false }
      ])
    } finally {
      await destroyVm(reportConv)
      await destroyVm(chatConv)
      await Bun.spawn(['rm', '-rf', root]).exited
      setDatastoreRoot(null)
    }
  })
})
