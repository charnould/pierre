import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { type FontBytesByVariant, Ream } from 'reamkit'

const MAX_PDF_BYTES = 10_000_000

export class DocxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocxError'
  }
}

export function renderDocx(template: Uint8Array, data: Record<string, unknown>): Uint8Array {
  try {
    const document = new Docxtemplater(new PizZip(template), {
      delimiters: { start: '{{', end: '}}' },
      linebreaks: true,
      nullGetter: () => '',
      paragraphLoop: true
    })
    document.render(data)
    return document.getZip().generate({ type: 'uint8array' })
  } catch {
    throw new DocxError('Le rendu du document Word a échoué')
  }
}

export async function docxToPdf(
  docx: Uint8Array,
  options?: { fonts?: FontBytesByVariant; remoteFonts?: boolean }
): Promise<Uint8Array> {
  try {
    const pdf = await Ream.parse(docx).convert('pdf', {
      ...(options?.fonts ? { fonts: options.fonts } : {}),
      ...(options?.remoteFonts === false
        ? {
            fontFetch: async () => {
              throw new Error('police distante')
            }
          }
        : {})
    })
    if (
      pdf.byteLength === 0 ||
      pdf.byteLength > MAX_PDF_BYTES ||
      new TextDecoder().decode(pdf.slice(0, 5)) !== '%PDF-'
    ) {
      throw new Error('invalid PDF')
    }
    return pdf
  } catch (error) {
    if (error instanceof DocxError) throw error
    throw new DocxError(
      'La conversion PDF a échoué. Vérifiez que les polices du document sont incorporées.'
    )
  }
}
