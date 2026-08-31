import { execFile } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { nativeImage } from 'electron'

import type { PickedAvatarImage } from '../../../src/shared/types/users'
import { pickedFromNativeImage, resolvePickedAvatar } from './resolve-picked-avatar'

const execFileAsync = promisify(execFile)

async function transcodeWithSips(filePath: string): Promise<PickedAvatarImage | null> {
  const dest = join(tmpdir(), `pierre-avatar-${process.pid}-${Date.now()}.png`)
  try {
    await execFileAsync('sips', ['-s', 'format', 'png', filePath, '--out', dest], {
      timeout: 10_000
    })
    return pickedFromNativeImage(nativeImage.createFromPath(dest))
  } catch {
    return null
  } finally {
    await unlink(dest).catch(() => {})
  }
}

export async function loadPickedAvatar(filePath: string): Promise<PickedAvatarImage> {
  return resolvePickedAvatar(filePath, {
    transcode: process.platform === 'darwin' ? transcodeWithSips : undefined,
    fromPath: (path) => pickedFromNativeImage(nativeImage.createFromPath(path))
  })
}
