import { describe, expect, test } from 'bun:test'

import { clampPan, coverScale, cropSourceRect } from './crop-square'

describe('coverScale', () => {
  test('covers the viewport with the shorter side', () => {
    expect(coverScale(200, 100, 100)).toBe(1)
    expect(coverScale(100, 200, 100)).toBe(1)
    expect(coverScale(400, 200, 100)).toBe(0.5)
  })
})

describe('cropSourceRect', () => {
  test('centers a landscape image at zoom 1', () => {
    expect(cropSourceRect(200, 100, 1, 0, 0, 100)).toEqual({ sx: 50, sy: 0, size: 100 })
  })

  test('centers a portrait image at zoom 1', () => {
    expect(cropSourceRect(100, 200, 1, 0, 0, 100)).toEqual({ sx: 0, sy: 50, size: 100 })
  })

  test('clamps pan so the crop stays inside the image', () => {
    const extreme = cropSourceRect(200, 100, 1, 10_000, -10_000, 100)
    expect(extreme.sx).toBeGreaterThanOrEqual(0)
    expect(extreme.sy).toBeGreaterThanOrEqual(0)
    expect(extreme.sx + extreme.size).toBeLessThanOrEqual(200)
    expect(extreme.sy + extreme.size).toBeLessThanOrEqual(100)
  })
})

describe('clampPan', () => {
  test('keeps pan at 0 when the image already fills exactly', () => {
    expect(clampPan(100, 100, 1, 40, -20, 100)).toEqual({ panX: 0, panY: 0 })
  })

  test('limits pan at zoom 2 so the crop stays covered', () => {
    expect(clampPan(200, 100, 2, 10_000, 10_000, 100)).toEqual({ panX: 150, panY: 50 })
    expect(clampPan(200, 100, 2, -10_000, -10_000, 100)).toEqual({ panX: -150, panY: -50 })
  })
})

describe('cropSourceRect zoom', () => {
  test('shrinks the source square when zoomed', () => {
    const full = cropSourceRect(200, 100, 1, 0, 0, 100)
    const zoomed = cropSourceRect(200, 100, 2, 0, 0, 100)
    expect(zoomed.size).toBe(full.size / 2)
    expect(zoomed.sx).toBeGreaterThan(full.sx)
  })
})

describe('cropImageToWebpBlob', () => {
  async function withStubCanvas<T>(
    canvas: {
      width: number
      height: number
      getContext: () => { drawImage: (...args: unknown[]) => void }
      toBlob: (cb: (blob: Blob | null) => void, type?: string) => void
    },
    run: () => Promise<T>
  ): Promise<T> {
    const hasDocument = typeof globalThis.document?.createElement === 'function'
    if (!hasDocument) {
      const previous = globalThis.document
      globalThis.document = {
        createElement: (tag: string) => {
          if (tag !== 'canvas') throw new Error(tag)
          return canvas
        }
      } as unknown as Document
      try {
        return await run()
      } finally {
        globalThis.document = previous
      }
    }
    const previous = document.createElement.bind(document)
    document.createElement = ((tag: string, options?: unknown) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return previous(tag, options as ElementCreationOptions)
    }) as typeof document.createElement
    try {
      return await run()
    } finally {
      document.createElement = previous
    }
  }

  test('draws a 512² crop and prefers webp', async () => {
    const { cropImageToWebpBlob, AVATAR_CROP_OUTPUT } = await import('./crop-square')
    const drawn: unknown[] = []
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args: unknown[]) => {
          drawn.push(args)
        }
      }),
      toBlob: (cb: (blob: Blob | null) => void, type?: string) => {
        cb(new Blob([new Uint8Array([1, 2, 3])], { type: type || 'image/webp' }))
      }
    }
    await withStubCanvas(canvas, async () => {
      const image = {
        naturalWidth: 200,
        naturalHeight: 100,
        width: 200,
        height: 100
      } as CanvasImageSource & {
        naturalWidth: number
        naturalHeight: number
        width: number
        height: number
      }
      const blob = await cropImageToWebpBlob(image, 1, 0, 0, 100)
      expect(canvas.width).toBe(AVATAR_CROP_OUTPUT)
      expect(canvas.height).toBe(AVATAR_CROP_OUTPUT)
      expect(blob.type).toBe('image/webp')
      expect(blob.size).toBe(3)
      expect(drawn[0]).toEqual([
        { naturalWidth: 200, naturalHeight: 100, width: 200, height: 100 },
        50,
        0,
        100,
        100,
        0,
        0,
        AVATAR_CROP_OUTPUT,
        AVATAR_CROP_OUTPUT
      ])
    })
  })

  test('falls back to jpeg when webp encoding is empty', async () => {
    const { cropImageToWebpBlob } = await import('./crop-square')
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob: (cb: (blob: Blob | null) => void, type?: string) => {
        if (type === 'image/webp') cb(new Blob([], { type }))
        else cb(new Blob([new Uint8Array([4, 5])], { type: 'image/jpeg' }))
      }
    }
    await withStubCanvas(canvas, async () => {
      const image = {
        naturalWidth: 100,
        naturalHeight: 100,
        width: 100,
        height: 100
      } as CanvasImageSource & {
        naturalWidth: number
        naturalHeight: number
        width: number
        height: number
      }
      const blob = await cropImageToWebpBlob(image, 1, 0, 0, 100)
      expect(blob.type).toBe('image/jpeg')
      expect(blob.size).toBe(2)
    })
  })
})
