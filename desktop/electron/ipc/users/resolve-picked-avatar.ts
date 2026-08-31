import type { PickedAvatarImage } from '../../../src/shared/types/users'

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export function pickedFromNativeImage(image: {
  isEmpty(): boolean
  getSize(): { width: number; height: number }
  toPNG(): Uint8Array
}): PickedAvatarImage | null {
  if (image.isEmpty()) return null
  const size = image.getSize()
  if (size.width < 1 || size.height < 1) return null
  return {
    name: 'avatar.png',
    type: 'image/png',
    buffer: copyArrayBuffer(image.toPNG()),
    width: size.width,
    height: size.height
  }
}

export type ResolvePickedAvatarIo = {
  transcode?: (filePath: string) => Promise<PickedAvatarImage | null>
  fromPath: (filePath: string) => PickedAvatarImage | null
}

export async function resolvePickedAvatar(
  filePath: string,
  io: ResolvePickedAvatarIo
): Promise<PickedAvatarImage> {
  if (io.transcode) {
    const converted = await io.transcode(filePath)
    if (converted) return converted
  }
  const encoded = io.fromPath(filePath)
  if (encoded) return encoded
  throw new Error('UNREADABLE_AVATAR')
}
