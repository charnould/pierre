import { basename } from 'node:path'

import type { IntakeSubmittedFile } from '../../../shared/activity-content'
import { INTAKE_ALLOWED_MIMES, type IntakeAllowedMime } from '../../../shared/intakes'

export type IntakeFileManifestEntry = {
  field: string
  filename: string
  mimeType: IntakeAllowedMime
  sizeBytes: number
  offset: number
}

export type IntakeUploadFile = {
  field: string
  filename: string
  mimeType: IntakeAllowedMime
  bytes: Uint8Array
}

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/** Sniffs real MIME type from binary magic bytes — never trusts extension or Content-Type. */
export function sniffAllowedMime(bytes: Uint8Array): IntakeAllowedMime | null {
  if (bytes.byteLength >= 5) {
    // %PDF-
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    ) {
      return 'application/pdf'
    }
  }
  if (bytes.byteLength >= 3) {
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg'
    }
  }
  if (bytes.byteLength >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'image/png'
    }
  }
  if (bytes.byteLength >= 12) {
    // WebP: RIFF....WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp'
    }
  }
  return null
}

/** Sanitizes an uploaded filename: basename, strip control chars / path separators. */
export function sanitizeIntakeFilename(raw: string): string {
  const normalized = raw.replaceAll('\\', '/')
  const base = Array.from(basename(normalized))
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code >= 0x20 && code !== 0x7f
    })
    .join('')
    .replace(/[/\\<>:"|?*]/g, '_')
    .trim()
  if (!base || /^\.+$/.test(base)) return 'fichier'
  return base.slice(0, 180)
}

/**
 * Deduplicates filenames deterministically within one submission:
 * `photo.jpg`, `photo-2.jpg`, `photo-3.jpg`.
 */
export function deduplicateFilename(filename: string, usedLower: Set<string>): string {
  const clean = sanitizeIntakeFilename(filename)
  if (!usedLower.has(clean.toLowerCase())) {
    usedLower.add(clean.toLowerCase())
    return clean
  }
  const dot = clean.lastIndexOf('.')
  const hasExt = dot > 0 && dot < clean.length - 1
  const stem = hasExt ? clean.slice(0, dot) : clean
  const ext = hasExt ? clean.slice(dot) : ''
  let suffix = 2
  while (true) {
    const candidate = `${stem}-${suffix}${ext}`
    if (!usedLower.has(candidate.toLowerCase())) {
      usedLower.add(candidate.toLowerCase())
      return candidate
    }
    suffix += 1
  }
}

/**
 * Encodes submission files into the deterministic `_files BLOB` binary envelope:
 * [4 bytes uint32 big-endian: manifest byte length N]
 * [N bytes: UTF-8 JSON manifest]
 * [raw bytes of each file concatenated in manifest order]
 */
export function packIntakeFilesBlob(files: readonly IntakeUploadFile[]): {
  blob: Uint8Array | null
  manifest: IntakeFileManifestEntry[]
} {
  if (files.length === 0) return { blob: null, manifest: [] }

  const manifest: IntakeFileManifestEntry[] = []
  let offset = 0
  for (const file of files) {
    manifest.push({
      field: file.field,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.bytes.byteLength,
      offset
    })
    offset += file.bytes.byteLength
  }

  const manifestBytes = encoder.encode(JSON.stringify(manifest))
  const totalLength = 4 + manifestBytes.byteLength + offset
  const blob = new Uint8Array(totalLength)
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  view.setUint32(0, manifestBytes.byteLength, false)
  blob.set(manifestBytes, 4)

  let cursor = 4 + manifestBytes.byteLength
  for (const file of files) {
    blob.set(file.bytes, cursor)
    cursor += file.bytes.byteLength
  }

  return { blob, manifest }
}

const ALLOWED_MIME_SET = new Set<string>(INTAKE_ALLOWED_MIMES)

function parseManifestEntry(raw: unknown): IntakeFileManifestEntry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid _files blob: manifest entry must be an object')
  }
  const entry = raw as Record<string, unknown>
  if (
    typeof entry['field'] !== 'string' ||
    typeof entry['filename'] !== 'string' ||
    typeof entry['mimeType'] !== 'string' ||
    !ALLOWED_MIME_SET.has(entry['mimeType']) ||
    typeof entry['sizeBytes'] !== 'number' ||
    !Number.isInteger(entry['sizeBytes']) ||
    typeof entry['offset'] !== 'number' ||
    !Number.isInteger(entry['offset'])
  ) {
    throw new Error('Invalid _files blob: malformed manifest entry')
  }
  return {
    field: entry['field'],
    filename: entry['filename'],
    mimeType: entry['mimeType'] as IntakeAllowedMime,
    sizeBytes: entry['sizeBytes'],
    offset: entry['offset']
  }
}

/** Reads only the manifest + payload start offset without copying file bytes. */
export function parseIntakeFilesEnvelope(blob: Uint8Array): {
  manifest: IntakeFileManifestEntry[]
  dataStart: number
} {
  if (blob.byteLength < 4) {
    throw new Error('Invalid _files blob: truncated header')
  }
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  const manifestLength = view.getUint32(0, false)
  const dataStart = 4 + manifestLength
  if (dataStart > blob.byteLength) {
    throw new Error('Invalid _files blob: manifest exceeds blob length')
  }
  const manifestRaw = decoder.decode(blob.subarray(4, dataStart))
  const parsed: unknown = JSON.parse(manifestRaw)
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid _files blob: manifest must be an array')
  }
  return {
    manifest: parsed.map(parseManifestEntry),
    dataStart
  }
}

function sliceIntakeFile(
  blob: Uint8Array,
  dataStart: number,
  entry: IntakeFileManifestEntry
): { entry: IntakeFileManifestEntry; bytes: Uint8Array } {
  const start = dataStart + entry.offset
  const end = start + entry.sizeBytes
  if (entry.offset < 0 || entry.sizeBytes < 0 || end > blob.byteLength) {
    throw new Error(`Invalid _files blob: file slice out of bounds for ${entry.filename}`)
  }
  return { entry, bytes: blob.subarray(start, end) }
}

/** Extracts a single file slice directly via `subarray` without decoding other files. */
export function extractIntakeFile(
  blob: Uint8Array,
  filename: string
): { entry: IntakeFileManifestEntry; bytes: Uint8Array } | null {
  const { manifest, dataStart } = parseIntakeFilesEnvelope(blob)
  const entry = manifest.find((item) => item.filename === filename)
  if (!entry) return null
  return sliceIntakeFile(blob, dataStart, entry)
}

/** Extracts all files in manifest order as zero-copy subarrays. */
export function unpackAllIntakeFiles(
  blob: Uint8Array
): Array<{ entry: IntakeFileManifestEntry; bytes: Uint8Array }> {
  const { manifest, dataStart } = parseIntakeFilesEnvelope(blob)
  return manifest.map((entry) => sliceIntakeFile(blob, dataStart, entry))
}

/** Projects binary manifest entries into the public activity-content file metadata contract. */
export function manifestToSubmittedFiles(
  manifest: readonly IntakeFileManifestEntry[]
): IntakeSubmittedFile[] {
  return manifest.map(({ field, filename, mimeType, sizeBytes }) => ({
    field,
    filename,
    mimeType,
    sizeBytes
  }))
}
