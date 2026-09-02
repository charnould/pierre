import { describe, expect, it } from 'bun:test'

import {
  ATTACHMENT_SUPPORTED_EXTENSIONS,
  isSupportedAttachment,
  needsDocumentExtract,
  unsupportedAttachmentDescription
} from '../../../../shared/attachment-extensions'

describe('attachment-extensions', () => {
  it('accepts all supported extensions', () => {
    for (const ext of ATTACHMENT_SUPPORTED_EXTENSIONS) {
      expect(isSupportedAttachment(new File([''], `file.${ext}`))).toBe(true)
    }
  })

  it('rejects unsupported extensions', () => {
    expect(isSupportedAttachment(new File([''], 'file.pages'))).toBe(false)
    expect(isSupportedAttachment(new File([''], 'file.exe'))).toBe(false)
    expect(isSupportedAttachment(new File([''], 'file.exe', { type: 'text/plain' }))).toBe(false)
  })

  it('describes unsupported formats in French', () => {
    expect(unsupportedAttachmentDescription('rapport.pages')).toBe(
      "Le format .pages n'est pas pris en charge."
    )
  })

  it('flags PDF and Office for document-extract', () => {
    expect(needsDocumentExtract('facture.pdf')).toBe(true)
    expect(needsDocumentExtract('budget.xlsx')).toBe(true)
    expect(needsDocumentExtract('note.txt')).toBe(false)
    expect(needsDocumentExtract('photo.png')).toBe(false)
  })
})
