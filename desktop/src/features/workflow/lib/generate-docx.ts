import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

export function generateDocxFilename(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} - Courrier sortant`
}

export async function generateDocxFromTemplate(
  templateBuffer: ArrayBuffer,
  data: { subject: string; body: string }
): Promise<Uint8Array> {
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
  doc.render({ subject: data.subject, body: data.body })
  return doc.getZip().generate({ type: 'uint8array' })
}
