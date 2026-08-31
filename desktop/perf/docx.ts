import PizZip from 'pizzip'

import { inspectBulkDocx } from '../src/features/outreach/lib/bulk-docx'

export type DocxMetrics = {
  bytes: number
  coldMs: number
  warmMedianMs: number
}

const sampleDocx = (): ArrayBuffer => {
  const zip = new PizZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  )
  zip.file(
    'word/document.xml',
    '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Bonjour {{nom}}, solde {{solde}}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>'
  )
  return zip.generate({ type: 'arraybuffer' })
}

const timedInspection = async (buffer: ArrayBuffer): Promise<number> => {
  const startedAt = performance.now()
  await inspectBulkDocx('benchmark.docx', buffer)
  return performance.now() - startedAt
}

export async function measureDocxInspection(): Promise<DocxMetrics> {
  const buffer = sampleDocx()
  const coldMs = await timedInspection(buffer)
  const warmSamples: number[] = []
  for (let iteration = 0; iteration < 7; iteration += 1) {
    warmSamples.push(await timedInspection(buffer))
  }
  warmSamples.sort((a, b) => a - b)
  return {
    bytes: buffer.byteLength,
    coldMs,
    warmMedianMs: warmSamples[Math.floor(warmSamples.length / 2)] ?? 0
  }
}
