import type Docxtemplater from 'docxtemplater'

export const MAX_BULK_DOCX_BYTES = 1_000_000

type DocxPart = Docxtemplater.DXT.Part

export type BulkDocxUpload = {
  filename: string
  fileBase64: string
  placeholders: string[]
}

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export async function inspectBulkDocx(
  filename: string,
  buffer: ArrayBuffer
): Promise<BulkDocxUpload> {
  if (!filename.toLowerCase().endsWith('.docx')) {
    throw new Error('Sélectionnez un fichier .docx.')
  }
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BULK_DOCX_BYTES) {
    throw new Error('Le fichier Word doit peser entre 1 octet et 1 Mo.')
  }

  const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
    import('docxtemplater'),
    import('pizzip')
  ])
  let zip: InstanceType<typeof PizZip>
  try {
    zip = new PizZip(buffer)
  } catch {
    throw new Error('Le fichier sélectionné n’est pas un document Word valide.')
  }
  if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) {
    throw new Error('Le fichier sélectionné n’est pas un document Word valide.')
  }

  const parts: DocxPart[] = []
  new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    linebreaks: true,
    modules: [
      {
        set(options: { inspect?: { postparsed?: DocxPart[] } }) {
          if (options.inspect?.postparsed) parts.push(...options.inspect.postparsed)
        }
      }
    ],
    paragraphLoop: true
  })

  const tags = parts.filter((part) => part.type === 'placeholder')
  if (tags.some((part) => part.module === 'loop' || part.subparsed?.length)) {
    throw new Error('Les boucles et conditions ne sont pas autorisées dans un modèle Bulk.')
  }

  const placeholders = [...new Set(tags.map((part) => part.value))]
  for (const placeholder of placeholders) {
    if (!identifier.test(placeholder)) {
      throw new Error(`Placeholder Word invalide : {{${placeholder}}}.`)
    }
  }

  return {
    filename,
    fileBase64: bytesToBase64(new Uint8Array(buffer)),
    placeholders: placeholders.sort((left, right) => left.localeCompare(right))
  }
}
