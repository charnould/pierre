import { describe, expect, spyOn, test } from 'bun:test'

import { processUploadedAttachments, type ProcessedPiAttachments } from '../../utils/ai-attachments'
import type { PierreInstance } from '../../utils/smolvm'
import {
  getConversationUploadsMountPath,
  getConversationUploadsPath,
  getKnowledgePath,
  getUploadsPath
} from '../../utils/smolvm'
import {
  acquireVm,
  conversationReservationCount,
  destroyVm,
  releaseVm,
  reserveConversation,
  type AcquireVmDependencies
} from '../../utils/vm-registry'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'

describe('VM registry conversation reservations', () => {
  test('replaces a mismatched VM immediately without deleting reserved staging', async () => {
    const previousService = Bun.env['SERVICE']
    const service = `_vm_reservation_${Bun.randomUUIDv7()}`
    Bun.env['SERVICE'] = service
    const events: string[] = []
    const disposed: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    let staged: ProcessedPiAttachments | undefined

    const dependencies: AcquireVmDependencies = {
      takePoolInstance: () => null,
      createInstance: async (convId, configId) => {
        events.push(`create:${configId}`)
        return {
          name: convId,
          knowledgePath: getKnowledgePath(configId),
          uploadsPath: getConversationUploadsPath(configId, convId),
          uploadsTarget: getConversationUploadsMountPath(convId),
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
          onEvent: () => () => {}
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
        getUploadsPath('new-config'),
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
      await Bun.spawn(['rm', '-rf', `${import.meta.dir}/../../datastores/${service}`]).exited
      logSpy.mockRestore()
      warnSpy.mockRestore()
      if (previousService === undefined) delete Bun.env['SERVICE']
      else Bun.env['SERVICE'] = previousService
    }
  })
})
