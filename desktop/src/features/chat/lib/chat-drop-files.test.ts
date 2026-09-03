import { describe, expect, test } from 'bun:test'

import {
  filesFromDataTransfer,
  formatAttachmentBytes,
  hasDraggedFiles,
  mergeAttachmentFiles
} from '@/shared/lib/attachment-files'

function file(name: string, size = 1): File {
  return new File([new Uint8Array(size)], name)
}

describe('attachment files', () => {
  test('recognizes and extracts an external file drag', () => {
    const files = [file('rapport.pdf')]
    expect(hasDraggedFiles({ types: ['text/plain', 'Files'] })).toBe(true)
    expect(filesFromDataTransfer({ files: files as unknown as FileList })).toEqual(files)
  })

  test('accepts supported files and rejects unsupported files', () => {
    const result = mergeAttachmentFiles([], [file('photo.png'), file('archive.zip')])

    expect(result.files.map(({ name }) => name)).toEqual(['photo.png'])
    expect(result.errors).toEqual(["archive.zip — Le format .zip n'est pas pris en charge."])
  })

  test('deduplicates by filename and size', () => {
    const original = file('rapport.pdf', 4)
    const result = mergeAttachmentFiles([original], [file('rapport.pdf', 4)])

    expect(result.files).toEqual([original])
    expect(result.errors).toEqual(['rapport.pdf est déjà joint.'])
  })

  test('enforces per-file, count and total limits', () => {
    const tooLarge = mergeAttachmentFiles([], [file('grand.pdf', 10 * 1024 * 1024 + 1)])
    expect(tooLarge.files).toEqual([])
    expect(tooLarge.errors[0]).toContain('10 Mo')

    const five = Array.from({ length: 5 }, (_, index) => file(`${index}.pdf`))
    const tooMany = mergeAttachmentFiles(five, [file('six.pdf')])
    expect(tooMany.files).toHaveLength(5)
    expect(tooMany.errors).toEqual(['Vous pouvez joindre au maximum 5 fichiers.'])

    const total = mergeAttachmentFiles(
      [file('a.pdf', 10 * 1024 * 1024), file('b.pdf', 10 * 1024 * 1024)],
      [file('c.pdf')]
    )
    expect(total.files).toHaveLength(2)
    expect(total.errors).toEqual(['Les pièces jointes ne peuvent pas dépasser 20 Mo au total.'])
  })

  test('includes files already uploaded in the conversation quotas', () => {
    const count = mergeAttachmentFiles([], [file('new.pdf')], { files: 5, bytes: 5 })
    expect(count.files).toEqual([])
    expect(count.errors).toEqual(['Vous pouvez joindre au maximum 5 fichiers.'])

    const bytes = mergeAttachmentFiles([], [file('new.pdf')], {
      files: 1,
      bytes: 20 * 1024 * 1024
    })
    expect(bytes.files).toEqual([])
    expect(bytes.errors).toEqual(['Les pièces jointes ne peuvent pas dépasser 20 Mo au total.'])
  })

  test('formats compact file sizes', () => {
    expect(formatAttachmentBytes(512)).toBe('512 o')
    expect(formatAttachmentBytes(2048)).toBe('2 Ko')
    expect(formatAttachmentBytes(1.5 * 1024 * 1024)).toBe('1,5 Mo')
  })
})
