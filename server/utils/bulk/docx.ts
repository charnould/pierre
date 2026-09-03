import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { Ream } from 'reamkit'

const MAX_SOURCE_BYTES = 1_000_000
const MAX_PDF_BYTES = 10_000_000

export class BulkDocxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BulkDocxError'
  }
}

export const render_docx = (fileBase64: string, values: Record<string, string>): Uint8Array => {
  let source: Uint8Array
  try {
    source = Uint8Array.fromBase64(fileBase64)
    if (source.byteLength === 0 || source.byteLength > MAX_SOURCE_BYTES) {
      throw new Error('size')
    }
    if (source[0] !== 0x50 || source[1] !== 0x4b) throw new Error('signature')
  } catch {
    throw new BulkDocxError('Le document Word est invalide')
  }
  try {
    const zip = new PizZip(source)
    const document = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true
    })
    document.render(values)
    return document.getZip().generate({ type: 'uint8array' })
  } catch {
    throw new BulkDocxError('Le rendu du document Word a échoué')
  }
}

export const docx_to_pdf = async (bytes: Uint8Array): Promise<Uint8Array> => {
  try {
    const pdf = await Ream.parse(bytes).convert('pdf')
    if (
      pdf.byteLength === 0 ||
      pdf.byteLength > MAX_PDF_BYTES ||
      new TextDecoder().decode(pdf.slice(0, 5)) !== '%PDF-'
    ) {
      throw new Error('invalid PDF')
    }
    return pdf
  } catch (error) {
    if (error instanceof BulkDocxError) throw error
    throw new BulkDocxError(
      'La conversion PDF a échoué. Vérifiez que les polices du document sont disponibles.'
    )
  }
}

export const render_docx_pdf = async (
  fileBase64: string,
  values: Record<string, string>
): Promise<Uint8Array> => docx_to_pdf(render_docx(fileBase64, values))
