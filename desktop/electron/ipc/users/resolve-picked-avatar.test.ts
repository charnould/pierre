import { describe, expect, test } from 'bun:test'

import { pickedFromNativeImage, resolvePickedAvatar } from './resolve-picked-avatar'

const SAMPLE = {
  name: 'avatar.png',
  type: 'image/png',
  buffer: new Uint8Array([1, 2, 3]).buffer,
  width: 8,
  height: 8
}

function fakeImage(
  width: number,
  height: number,
  empty = false
): {
  isEmpty(): boolean
  getSize(): { width: number; height: number }
  toPNG(): Uint8Array
} {
  return {
    isEmpty: () => empty,
    getSize: () => ({ width, height }),
    toPNG: () => new Uint8Array([9, 8, 7])
  }
}

describe('pickedFromNativeImage', () => {
  test('returns null when empty or sizeless', () => {
    expect(pickedFromNativeImage(fakeImage(8, 8, true))).toBeNull()
    expect(pickedFromNativeImage(fakeImage(0, 8))).toBeNull()
  })

  test('copies png bytes and size', () => {
    const picked = pickedFromNativeImage(fakeImage(12, 10))
    expect(picked).toMatchObject({ name: 'avatar.png', type: 'image/png', width: 12, height: 10 })
    expect(new Uint8Array(picked!.buffer)).toEqual(new Uint8Array([9, 8, 7]))
  })
})

describe('resolvePickedAvatar', () => {
  test('uses transcode when it returns an image', async () => {
    await expect(
      resolvePickedAvatar('/cloud/Photo.jpg', {
        transcode: async () => SAMPLE,
        fromPath: () => null
      })
    ).resolves.toEqual(SAMPLE)
  })

  test('falls back to fromPath when transcode fails', async () => {
    await expect(
      resolvePickedAvatar('/cloud/Photo.jpg', {
        transcode: async () => null,
        fromPath: () => SAMPLE
      })
    ).resolves.toEqual(SAMPLE)
  })

  test('throws UNREADABLE_AVATAR when both paths fail', async () => {
    await expect(
      resolvePickedAvatar('/cloud/Photo.jpg', {
        transcode: async () => null,
        fromPath: () => null
      })
    ).rejects.toThrow('UNREADABLE_AVATAR')
  })

  test('skips transcode when not provided', async () => {
    await expect(
      resolvePickedAvatar('/cloud/Photo.jpg', { fromPath: () => SAMPLE })
    ).resolves.toEqual(SAMPLE)
  })
})
