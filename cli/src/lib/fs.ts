import { closeSync, fsyncSync, openSync, renameSync, rmSync, symlinkSync } from 'node:fs'
import { dirname } from 'node:path'

export function fsyncPath(path: string) {
  const descriptor = openSync(path, 'r')
  try {
    fsyncSync(descriptor)
  } finally {
    closeSync(descriptor)
  }
}

export function publishFile(temporary: string, path: string) {
  fsyncPath(temporary)
  renameSync(temporary, path)
  fsyncPath(dirname(path))
}

export function replaceSymlink(path: string, target: string) {
  const next = `${path}.new`
  rmSync(next, { force: true })
  symlinkSync(target, next)
  publishFile(next, path)
}
