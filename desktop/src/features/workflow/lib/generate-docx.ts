export function generateDocxFilename(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} - Courrier sortant`
}

export async function renderDocxTemplate(
  templateBuffer: ArrayBuffer,
  data: Record<string, unknown>
): Promise<Uint8Array> {
  const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
    import('docxtemplater'),
    import('pizzip')
  ])
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' }
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'uint8array' })
}

export async function generateDocxFromTemplate(
  templateBuffer: ArrayBuffer,
  data: {
    SUBJECT: string
    BODY: string
    ADRESSE: string
    CODE_POSTAL: string
    VILLE: string
  }
): Promise<Uint8Array> {
  return renderDocxTemplate(templateBuffer, {
    SUBJECT: data.SUBJECT,
    BODY: data.BODY,
    ADRESSE: data.ADRESSE,
    CODE_POSTAL: data.CODE_POSTAL,
    VILLE: data.VILLE
  })
}
