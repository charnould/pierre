import { dlopen, FFIType } from 'bun:ffi'
import { closeSync, constants, mkdirSync, openSync } from 'node:fs'
import { dirname } from 'node:path'

import type { Context } from './system.ts'
import { failed } from './text.ts'

const LOCK_EX = 2
const LOCK_NB = 4
const LOCK_UN = 8

export function acquireFileLock(path: string): (() => void) | null {
  const fd = openSync(path, constants.O_CREAT | constants.O_RDWR, 0o600)
  const library = dlopen(
    process.platform === 'darwin' ? '/usr/lib/libSystem.B.dylib' : 'libc.so.6',
    {
      flock: {
        args: [FFIType.i32, FFIType.i32],
        returns: FFIType.i32
      }
    }
  )
  if (library.symbols.flock(fd, LOCK_EX | LOCK_NB) !== 0) {
    library.close()
    closeSync(fd)
    return null
  }
  return () => {
    library.symbols.flock(fd, LOCK_UN)
    library.close()
    closeSync(fd)
  }
}

export async function withPierreLock<T>(ctx: Context, action: () => Promise<T>): Promise<T | null> {
  const path = ctx.runtime.paths.lockFile
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const release = acquireFileLock(path)
  if (!release) {
    failed(ctx, 'Une autre opération est déjà en cours.')
    return null
  }
  try {
    return await action()
  } finally {
    release()
  }
}
