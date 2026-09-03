import { describe, expect, test } from 'bun:test'

import {
  AVATAR_MAX_UPLOAD_BYTES,
  AVATAR_SIZE,
  encode_user_avatar
} from '../../../utils/avatar-image'

const PNG_1x1 = Uint8Array.fromBase64(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

describe('encode_user_avatar', () => {
  test('re-encodes a PNG to 256² WebP', async () => {
    const out = await encode_user_avatar(PNG_1x1)
    if ('error' in out) throw new Error(out.error)
    const meta = await new Bun.Image(out).metadata()
    expect(meta.width).toBe(AVATAR_SIZE)
    expect(meta.height).toBe(AVATAR_SIZE)
    expect(meta.format).toBe('webp')
  })

  test('rejects empty and invalid bytes', async () => {
    expect(await encode_user_avatar(new Uint8Array())).toEqual({ error: 'empty image' })
    expect(await encode_user_avatar(new Uint8Array([1, 2, 3, 4]))).toEqual({
      error: 'invalid image'
    })
  })

  test('rejects oversized uploads', async () => {
    const huge = new Uint8Array(AVATAR_MAX_UPLOAD_BYTES + 1)
    expect(await encode_user_avatar(huge)).toEqual({ error: 'image too large' })
  })
})
