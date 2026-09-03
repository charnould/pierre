import {
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  isSupportedAttachment,
  unsupportedAttachmentDescription
} from '../../../../shared/attachment-extensions'

export type AttachmentMergeResult = {
  files: File[]
  errors: string[]
}

export type AttachmentUsage = {
  files: number
  bytes: number
}

function fileKey(file: File): string {
  return `${file.name}\0${file.size}`
}

export function hasDraggedFiles(dataTransfer: Pick<DataTransfer, 'types'>): boolean {
  return Array.from(dataTransfer.types).includes('Files')
}

export function filesFromDataTransfer(dataTransfer: Pick<DataTransfer, 'files'>): File[] {
  return Array.from(dataTransfer.files)
}

export function mergeAttachmentFiles(
  current: File[],
  incoming: File[],
  existingUsage: AttachmentUsage = { files: 0, bytes: 0 }
): AttachmentMergeResult {
  const files = [...current]
  const errors: string[] = []
  const keys = new Set(current.map(fileKey))
  let totalBytes = existingUsage.bytes + current.reduce((total, file) => total + file.size, 0)

  for (const file of incoming) {
    const key = fileKey(file)
    if (keys.has(key)) {
      errors.push(`${file.name} est déjà joint.`)
      continue
    }
    if (!isSupportedAttachment(file)) {
      errors.push(`${file.name} — ${unsupportedAttachmentDescription(file.name)}`)
      continue
    }
    if (file.size > MAX_ATTACHMENT_FILE_BYTES) {
      errors.push(`${file.name} dépasse la limite de 10 Mo.`)
      continue
    }
    if (existingUsage.files + files.length >= MAX_ATTACHMENT_FILES) {
      errors.push(`Vous pouvez joindre au maximum ${MAX_ATTACHMENT_FILES} fichiers.`)
      break
    }
    if (totalBytes + file.size > MAX_ATTACHMENT_TOTAL_BYTES) {
      errors.push('Les pièces jointes ne peuvent pas dépasser 20 Mo au total.')
      continue
    }

    files.push(file)
    keys.add(key)
    totalBytes += file.size
  }

  return { files, errors: [...new Set(errors)] }
}

export function formatAttachmentBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', {
    maximumFractionDigits: 1
  })} Mo`
}
