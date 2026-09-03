/** Shared attachment allowlist — desktop chat composer and server upload handler. */

export const ATTACHMENT_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

export const ATTACHMENT_TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json'])

const ATTACHMENT_DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'pptx',
  'xlsx',
  'xls',
  'xlsm',
  'xlsb'
])

export const ATTACHMENT_SUPPORTED_EXTENSIONS = new Set([
  ...ATTACHMENT_IMAGE_EXTENSIONS,
  ...ATTACHMENT_TEXT_EXTENSIONS,
  ...ATTACHMENT_DOCUMENT_EXTENSIONS
])

export const MAX_ATTACHMENT_FILES = 5
export const MAX_ATTACHMENT_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENT_TOTAL_BYTES = 20 * 1024 * 1024

function attachmentExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function isSupportedAttachment(file: Pick<File, 'name' | 'type'>): boolean {
  const ext = attachmentExtension(file.name)
  return ext.length > 0 && ATTACHMENT_SUPPORTED_EXTENSIONS.has(ext)
}

export function unsupportedAttachmentDescription(name: string): string {
  const ext = attachmentExtension(name)
  if (ext) return `Le format .${ext} n'est pas pris en charge.`
  return "Ce type de fichier n'est pas pris en charge."
}

export function needsDocumentExtract(name: string): boolean {
  return ATTACHMENT_DOCUMENT_EXTENSIONS.has(attachmentExtension(name))
}
