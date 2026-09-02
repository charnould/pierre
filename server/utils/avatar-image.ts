export const AVATAR_SIZE = 256
export const AVATAR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const AVATAR_MAX_PIXELS = 2048 * 2048

export async function encode_user_avatar(
  bytes: Uint8Array
): Promise<Uint8Array | { error: string }> {
  if (bytes.byteLength === 0) return { error: 'empty image' }
  if (bytes.byteLength > AVATAR_MAX_UPLOAD_BYTES) return { error: 'image too large' }
  try {
    return await new Bun.Image(bytes.slice(), {
      maxPixels: AVATAR_MAX_PIXELS,
      autoOrient: true
    })
      .resize(AVATAR_SIZE, AVATAR_SIZE)
      .webp({ quality: 80 })
      .bytes()
  } catch {
    return { error: 'invalid image' }
  }
}
