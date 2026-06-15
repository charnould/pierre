import { afterAll, describe, expect, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { convertToImage } from '../../../utils/convert-to-image'

const MOCK_PDF = join(import.meta.dir, '__mocks__/input-2-pages.pdf')
const OUTPUT_PNG = join('/tmp', `convert-to-image-test-${Date.now()}.png`)

afterAll(() => {
  try {
    rmSync(OUTPUT_PNG)
  } catch {}
})

describe('convertToImage', () => {
  it('converts a 2-page PDF into a single PNG file', async () => {
    await convertToImage(MOCK_PDF, OUTPUT_PNG)
    expect(existsSync(OUTPUT_PNG)).toBe(true)
  })

  it('output is a valid PNG (correct magic bytes)', async () => {
    const buf = Buffer.from(await Bun.file(OUTPUT_PNG).arrayBuffer())
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50) // P
    expect(buf[2]).toBe(0x4e) // N
    expect(buf[3]).toBe(0x47) // G
  })

  it('output image is taller than wide (pages stacked vertically)', async () => {
    // Use ImageMagick identify to get dimensions
    const proc = Bun.spawn(['identify', '-format', '%wx%h\n', OUTPUT_PNG], { stderr: 'pipe' })
    await proc.exited
    const out = await new Response(proc.stdout).text()
    // A4 at 150dpi is ~826×1169px — two pages stacked → height should be ~2× width
    const match = out
      .trim()
      .split('\n')[0]
      .match(/^(\d+)x(\d+)$/)
    expect(match).not.toBeNull()
    const [, w, h] = match!.map(Number)
    expect(h).toBeGreaterThan(w)
  })

  it('throws if the input file does not exist', async () => {
    await expect(convertToImage('/tmp/does-not-exist.pdf', '/tmp/out.png')).rejects.toThrow()
  })
})
