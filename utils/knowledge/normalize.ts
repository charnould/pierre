export function normalizeFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  const extension = lastDotIndex > 0 ? filename.slice(lastDotIndex) : ''
  const nameWithoutExt = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename

  const normalized = nameWithoutExt
    .normalize('NFC')
    .replace('ç', 'c')
    .replace('œ', 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized + extension
}
