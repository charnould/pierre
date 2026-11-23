import { describe, expect, it } from 'bun:test'

import {
  deduplicateFilename,
  extractIntakeFile,
  packIntakeFilesBlob,
  parseIntakeFilesEnvelope,
  sanitizeIntakeFilename,
  sniffAllowedMime,
  unpackAllIntakeFiles
} from '../../../../utils/intakes/files'

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n')
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x12, 0x00, 0x00, 0x00, 0x57, 0x45, 0x50, 0x42
])
const VALID_WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x12, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
])

describe('intake files helpers', () => {
  it('sniffs allowed PDF, JPEG, PNG and WebP magic bytes and rejects spoofed buffers', () => {
    expect(sniffAllowedMime(PDF_BYTES)).toBe('application/pdf')
    expect(sniffAllowedMime(JPEG_BYTES)).toBe('image/jpeg')
    expect(sniffAllowedMime(PNG_BYTES)).toBe('image/png')
    expect(sniffAllowedMime(VALID_WEBP_BYTES)).toBe('image/webp')

    expect(sniffAllowedMime(WEBP_BYTES)).toBeNull()
    expect(sniffAllowedMime(new TextEncoder().encode('<html>not a pdf</html>'))).toBeNull()
    expect(sniffAllowedMime(new Uint8Array([0x25, 0x50]))).toBeNull()
  })

  it('sanitizes and deduplicates filenames cleanly', () => {
    expect(sanitizeIntakeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeIntakeFilename('  Facture été 2026?.pdf ')).toBe('Facture été 2026_.pdf')
    expect(sanitizeIntakeFilename('...')).toBe('fichier')

    const used = new Set<string>()
    expect(deduplicateFilename('photo.jpg', used)).toBe('photo.jpg')
    expect(deduplicateFilename('PHOTO.JPG', used)).toBe('PHOTO-2.JPG')
    expect(deduplicateFilename('photo.jpg', used)).toBe('photo-3.jpg')
  })

  it('packs, parses, extracts and unpacks multiple files in one BLOB', () => {
    const empty = packIntakeFilesBlob([])
    expect(empty.blob).toBeNull()
    expect(empty.manifest).toEqual([])

    const packed = packIntakeFilesBlob([
      {
        field: 'piece_identite',
        filename: 'carte.pdf',
        mimeType: 'application/pdf',
        bytes: PDF_BYTES
      },
      {
        field: 'justificatif',
        filename: 'photo.png',
        mimeType: 'image/png',
        bytes: PNG_BYTES
      }
    ])

    expect(packed.blob).not.toBeNull()
    expect(packed.manifest).toEqual([
      {
        field: 'piece_identite',
        filename: 'carte.pdf',
        mimeType: 'application/pdf',
        offset: 0,
        sizeBytes: PDF_BYTES.byteLength
      },
      {
        field: 'justificatif',
        filename: 'photo.png',
        mimeType: 'image/png',
        offset: PDF_BYTES.byteLength,
        sizeBytes: PNG_BYTES.byteLength
      }
    ])

    const envelope = parseIntakeFilesEnvelope(packed.blob!)
    expect(envelope.manifest).toHaveLength(2)

    const extracted = extractIntakeFile(packed.blob!, 'photo.png')
    expect(extracted?.entry.mimeType).toBe('image/png')
    expect(Array.from(extracted?.bytes ?? [])).toEqual(Array.from(PNG_BYTES))
    expect(extractIntakeFile(packed.blob!, 'missing.pdf')).toBeNull()

    const unpacked = unpackAllIntakeFiles(packed.blob!)
    expect(unpacked.map((item) => item.entry.filename)).toEqual(['carte.pdf', 'photo.png'])
    expect(Array.from(unpacked[0]!.bytes)).toEqual(Array.from(PDF_BYTES))
    expect(Array.from(unpacked[1]!.bytes)).toEqual(Array.from(PNG_BYTES))
  })

  it('rejects malformed manifest entries in _files blobs', () => {
    const manifest = new TextEncoder().encode(
      JSON.stringify([
        {
          field: 'doc',
          filename: 'x.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 1,
          offset: 0
        }
      ])
    )
    const blob = new Uint8Array(4 + manifest.byteLength + 1)
    new DataView(blob.buffer).setUint32(0, manifest.byteLength, false)
    blob.set(manifest, 4)
    expect(() => parseIntakeFilesEnvelope(blob)).toThrow('malformed manifest entry')
  })
})
