import { afterEach, describe, expect, it } from 'bun:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  emptyDirectory,
  syncDirectoryToSlot,
  vmResources,
  withVmCreationSlot
} from '../../../utils/smolvm'
import {
  computePoolFingerprint,
  createVmPool,
  type VmPoolDependencies
} from '../../../utils/vm-pool'

const originalCpus = Bun.env['SMOLVM_CPUS']
const originalMemory = Bun.env['SMOLVM_MEMORY_MIB']
const tempDirs: string[] = []

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  if (originalCpus === undefined) delete Bun.env['SMOLVM_CPUS']
  else Bun.env['SMOLVM_CPUS'] = originalCpus
  if (originalMemory === undefined) delete Bun.env['SMOLVM_MEMORY_MIB']
  else Bun.env['SMOLVM_MEMORY_MIB'] = originalMemory
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

describe('vmResources and withVmCreationSlot', () => {
  it('uses 2 vCPU / 512 MiB defaults and accepts deployment overrides', () => {
    delete Bun.env['SMOLVM_CPUS']
    delete Bun.env['SMOLVM_MEMORY_MIB']
    expect(vmResources()).toEqual({ cpus: 2, memoryMiB: 512 })

    Bun.env['SMOLVM_CPUS'] = '4'
    Bun.env['SMOLVM_MEMORY_MIB'] = '2048'
    expect(vmResources()).toEqual({ cpus: 4, memoryMiB: 2048 })
  })

  it('serializes tasks (peak === 1) and preempts queued low tasks with high priority', async () => {
    let active = 0
    let peak = 0
    const order: string[] = []
    let releaseFirst!: () => void
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const track = (label: string, priority: 'high' | 'low', gate?: Promise<void>) =>
      withVmCreationSlot(async () => {
        active += 1
        peak = Math.max(peak, active)
        order.push(label)
        if (gate) await gate
        active -= 1
      }, priority)

    const t1 = track('low-running', 'low', firstGate)
    const t2 = track('low-1', 'low')
    const t3 = track('low-2', 'low')
    const t4 = track('high-1', 'high')
    const t5 = track('high-2', 'high')

    await Bun.sleep(0)
    expect(peak).toBe(1)
    expect(order).toEqual(['low-running'])

    releaseFirst()
    await Promise.all([t1, t2, t3, t4, t5])

    expect(peak).toBe(1)
    expect(order).toEqual(['low-running', 'high-1', 'high-2', 'low-1', 'low-2'])
  })
})

describe('syncDirectoryToSlot and emptyDirectory', () => {
  it('hardlinks files incrementally, ignores escaping symlinks, and preserves mountpoint inode on wipe', () => {
    const root = makeTempDir('pierre-slot-sync-')
    const source = join(root, 'source')
    const slot = join(root, 'slot')
    const outside = join(root, 'secret.txt')
    mkdirSync(join(source, 'nested'), { recursive: true })
    mkdirSync(slot, { recursive: true })

    writeFileSync(outside, 'do-not-expose')
    writeFileSync(join(source, 'AGENTS.md'), 'turn 1 context')
    writeFileSync(join(source, 'nested', 'doc1.txt'), 'first upload')
    symlinkSync(outside, join(source, 'escape.txt'))

    const mountInode = statSync(slot).ino

    syncDirectoryToSlot(source, slot)

    expect(statSync(join(slot, 'AGENTS.md')).ino).toBe(statSync(join(source, 'AGENTS.md')).ino)
    expect(statSync(join(slot, 'nested', 'doc1.txt')).ino).toBe(
      statSync(join(source, 'nested', 'doc1.txt')).ino
    )
    expect(existsSync(join(slot, 'escape.txt'))).toBe(false)

    // Turn 2 incremental sync adds new files without replacing existing inodes
    const existingInode = statSync(join(slot, 'nested', 'doc1.txt')).ino
    writeFileSync(join(source, 'nested', 'doc2.txt'), 'second upload')
    syncDirectoryToSlot(source, slot)

    expect(statSync(join(slot, 'nested', 'doc1.txt')).ino).toBe(existingInode)
    expect(statSync(join(slot, 'nested', 'doc2.txt')).ino).toBe(
      statSync(join(source, 'nested', 'doc2.txt')).ino
    )

    // Wiping slot clears all entries while preserving the root mountpoint inode
    emptyDirectory(slot)
    expect(statSync(slot).ino).toBe(mountInode)
    expect(existsSync(join(slot, 'AGENTS.md'))).toBe(false)
    expect(existsSync(join(slot, 'nested'))).toBe(false)
    // Original source files remain intact after unlinking slot hardlinks
    expect(existsSync(join(source, 'AGENTS.md'))).toBe(true)
  })
})

describe('computePoolFingerprint', () => {
  it('is stable for identical inputs and changes on image or resource changes', () => {
    const root = makeTempDir('pierre-pool-fp-')
    const image = join(root, 'pierre.smolmachine')
    const slots = join(root, 'slots')
    writeFileSync(image, 'image-v1')

    const fp1 = computePoolFingerprint(image, { cpus: 2, memoryMiB: 512 }, slots)
    const fp2 = computePoolFingerprint(image, { cpus: 2, memoryMiB: 512 }, slots)
    expect(fp1).toHaveLength(16)
    expect(fp1).toBe(fp2)

    expect(computePoolFingerprint(image, { cpus: 4, memoryMiB: 512 }, slots)).not.toBe(fp1)
    expect(computePoolFingerprint(image, { cpus: 2, memoryMiB: 1024 }, slots)).not.toBe(fp1)

    writeFileSync(image, 'image-v2-different-size')
    expect(computePoolFingerprint(image, { cpus: 2, memoryMiB: 512 }, slots)).not.toBe(fp1)
  })
})

describe('bounded hot VM pool', () => {
  it('pops synchronously, recycles under capacity, and deletes excess above poolSize', async () => {
    const root = makeTempDir('pierre-pool-bounded-')
    const slotsRoot = join(root, '_pool')
    const created: string[] = []
    const started: string[] = []
    const stopped: string[] = []
    const deleted: string[] = []
    const removedDirs: string[] = []

    const deps: VmPoolDependencies = {
      poolSize: () => 2,
      slotsRoot: () => slotsRoot,
      fingerprint: () => 'fp-1234567890abcdef',
      listMachines: async () => [],
      createMachine: async (name) => {
        created.push(name)
      },
      startMachine: async (name) => {
        started.push(name)
      },
      stopMachine: async (name) => {
        stopped.push(name)
      },
      deleteMachine: async (name) => {
        deleted.push(name)
      },
      warmPi: async () => ({
        piProcess: { kill() {} } as never,
        piClient: { dispose() {}, onClose: () => () => {} } as never,
        providerFingerprint: 'prov-fp-1',
        thinkingLevel: 'medium'
      }),
      currentProviderFingerprint: () => 'prov-fp-1',
      emptySlot: () => {},
      removeSlotDir: (_root, name) => {
        removedDirs.push(name)
      }
    }

    const pool = createVmPool(deps)
    await pool.initVmPool()

    expect(created).toEqual(['pierre-pool-0', 'pierre-pool-1'])
    expect(pool.availableCount()).toBe(2)

    // takePoolVm is synchronous (non-blocking) and schedules refill via microtask
    const first = pool.takePoolVm()
    expect(first?.name).toBe('pierre-pool-0')
    expect(pool.availableCount()).toBe(1)

    // Let background refill create replacement pierre-pool-2 so pool is back to 2
    await Bun.sleep(10)
    expect(created).toEqual(['pierre-pool-0', 'pierre-pool-1', 'pierre-pool-2'])
    expect(pool.availableCount()).toBe(2)

    // Recycling pierre-pool-0 while pool is already at capacity (2) deletes the excess VM
    await pool.recyclePoolVm('pierre-pool-0')
    expect(stopped).toContain('pierre-pool-0')
    expect(deleted).toEqual(['pierre-pool-0'])
    expect(removedDirs).toEqual(['pierre-pool-0'])
    expect(pool.availableCount()).toBe(2)

    // Taking one without waiting for refill and recycling under capacity reuses the VM without delete
    const second = pool.takePoolVm()
    expect(second?.name).toBe('pierre-pool-1')
    const deletesBefore = deleted.length
    const startsBefore = started.length
    await pool.recyclePoolVm('pierre-pool-1')
    expect(deleted.length).toBe(deletesBefore)
    expect(started.slice(startsBefore)).toContain('pierre-pool-1')
    expect(pool.availableCount()).toBe(2)
  })
})
