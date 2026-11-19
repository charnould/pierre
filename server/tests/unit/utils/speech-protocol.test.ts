import { describe, expect, it } from 'bun:test'

import { encodePcmFrame, pcm16ToFloat32, takePcmFrame } from '../../../utils/speech-protocol'

describe('speech audio frames', () => {
  it('round-trips a PCM payload split across reads', () => {
    const pcm = Uint8Array.of(0, 0, 0xff, 0x7f, 0, 0x80)
    const frame = encodePcmFrame(pcm)
    expect(takePcmFrame(frame.subarray(0, 3))).toBeNull()
    expect(takePcmFrame(frame.subarray(0, 5))).toBeNull()
    const taken = takePcmFrame(frame)
    expect(taken?.rest).toHaveLength(0)
    expect(Array.from(taken?.pcm ?? [])).toEqual(Array.from(pcm))
    expect(Array.from(pcm16ToFloat32(pcm))).toEqual([0, 32767 / 32768, -1])
  })

  it('refuses a frame larger than the request limit', () => {
    const header = new Uint8Array(4)
    new DataView(header.buffer).setUint32(0, 4 * 1024 * 1024 + 1, true)
    expect(() => takePcmFrame(header)).toThrow('Trame audio trop grande.')
  })
})
