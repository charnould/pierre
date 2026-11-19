const HEADER = 4
const SPEECH_FRAME_LIMIT = 4 * 1024 * 1024

export function encodePcmFrame(pcm: Uint8Array): Uint8Array {
  const frame = new Uint8Array(HEADER + pcm.byteLength)
  new DataView(frame.buffer).setUint32(0, pcm.byteLength, true)
  frame.set(pcm, HEADER)
  return frame
}

export function takePcmFrame(buffer: Uint8Array): { pcm: Uint8Array; rest: Uint8Array } | null {
  if (buffer.byteLength < HEADER) return null
  const size = new DataView(buffer.buffer, buffer.byteOffset, HEADER).getUint32(0, true)
  if (size > SPEECH_FRAME_LIMIT) throw new Error('Trame audio trop grande.')
  const end = HEADER + size
  if (buffer.byteLength < end) return null
  return {
    pcm: buffer.subarray(HEADER, end),
    rest: buffer.subarray(end)
  }
}

/** 16 kHz mono PCM signed 16-bit little-endian → float samples in [-1, 1]. */
export function pcm16ToFloat32(pcm: Uint8Array): Float32Array {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  const samples = new Float32Array(Math.floor(pcm.byteLength / 2))
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 32768
  }
  return samples
}
