export const AVATAR_CROP_OUTPUT = 512
export const AVATAR_ZOOM_MIN = 1
export const AVATAR_ZOOM_MAX = 3

export function coverScale(imageWidth: number, imageHeight: number, viewport: number): number {
  if (imageWidth <= 0 || imageHeight <= 0 || viewport <= 0) return 1
  return Math.max(viewport / imageWidth, viewport / imageHeight)
}

function cropLayout(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  viewport: number
): { scale: number; size: number } {
  const z = Math.min(AVATAR_ZOOM_MAX, Math.max(AVATAR_ZOOM_MIN, zoom))
  const scale = coverScale(imageWidth, imageHeight, viewport) * z
  return { scale, size: Math.min(imageWidth, imageHeight, viewport / scale) }
}

export function cropSourceRect(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  viewport: number
): { sx: number; sy: number; size: number } {
  const { scale, size } = cropLayout(imageWidth, imageHeight, zoom, viewport)
  const maxX = Math.max(0, imageWidth - size)
  const maxY = Math.max(0, imageHeight - size)
  const sx = Math.min(maxX, Math.max(0, imageWidth / 2 - panX / scale - size / 2))
  const sy = Math.min(maxY, Math.max(0, imageHeight / 2 - panY / scale - size / 2))
  return { sx, sy, size }
}

export function clampPan(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  viewport: number
): { panX: number; panY: number } {
  const { scale, size } = cropLayout(imageWidth, imageHeight, zoom, viewport)
  const maxPanX = ((imageWidth - size) / 2) * scale
  const maxPanY = ((imageHeight - size) / 2) * scale
  return {
    panX: Math.min(maxPanX, Math.max(-maxPanX, panX)) || 0,
    panY: Math.min(maxPanY, Math.max(-maxPanY, panY)) || 0
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function cropImageToWebpBlob(
  image: CanvasImageSource & {
    naturalWidth?: number
    naturalHeight?: number
    width: number
    height: number
  },
  zoom: number,
  panX: number,
  panY: number,
  viewport: number
): Promise<Blob> {
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height
  const { sx, sy, size } = cropSourceRect(imageWidth, imageHeight, zoom, panX, panY, viewport)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_CROP_OUTPUT
  canvas.height = AVATAR_CROP_OUTPUT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(image, sx, sy, size, size, 0, 0, AVATAR_CROP_OUTPUT, AVATAR_CROP_OUTPUT)
  const webp = await canvasToBlob(canvas, 'image/webp', 0.9)
  if (webp && webp.size > 0) return webp
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.9)
  if (jpeg && jpeg.size > 0) return jpeg
  throw new Error('encode')
}
