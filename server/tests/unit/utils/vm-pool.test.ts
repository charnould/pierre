import { afterEach, describe, expect, it } from 'bun:test'

import { vmResources, withVmCreationSlot } from '../../../utils/vm-pool'

const originalCpus = Bun.env['SMOLVM_CPUS']
const originalMemory = Bun.env['SMOLVM_MEMORY_MIB']

afterEach(() => {
  if (originalCpus === undefined) delete Bun.env['SMOLVM_CPUS']
  else Bun.env['SMOLVM_CPUS'] = originalCpus
  if (originalMemory === undefined) delete Bun.env['SMOLVM_MEMORY_MIB']
  else Bun.env['SMOLVM_MEMORY_MIB'] = originalMemory
})

describe('vmResources', () => {
  it('uses compact defaults and accepts deployment overrides', () => {
    delete Bun.env['SMOLVM_CPUS']
    delete Bun.env['SMOLVM_MEMORY_MIB']
    expect(vmResources()).toEqual({ cpus: 1, memoryMiB: 512 })

    Bun.env['SMOLVM_CPUS'] = '2'
    Bun.env['SMOLVM_MEMORY_MIB'] = '2048'
    expect(vmResources()).toEqual({ cpus: 2, memoryMiB: 2048 })
  })

  it('limits machine commands to one process at a time', async () => {
    let active = 0
    let peak = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const creations = Array.from({ length: 4 }, () =>
      withVmCreationSlot(async () => {
        active += 1
        peak = Math.max(peak, active)
        await gate
        active -= 1
      })
    )
    await Bun.sleep(0)
    expect(peak).toBe(1)
    release()
    await Promise.all(creations)
  })
})
