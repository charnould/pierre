import { describe, expect, it } from 'bun:test'

import PizZip from 'pizzip'

import { BulkDocxError, docx_to_pdf, render_docx } from '../../../../utils/bulk/docx'

const source_docx = (): string => {
  const zip = new PizZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  )
  zip
    .folder('_rels')
    .file(
      '.rels',
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    )
  zip
    .folder('word')
    .file(
      'document.xml',
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Bonjour {{nom}}</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>'
    )
  return Buffer.from(zip.generate({ type: 'uint8array' })).toString('base64')
}

describe('bulk DOCX rendering', () => {
  it('renders double-brace placeholders and converts to a bounded PDF', async () => {
    const rendered = render_docx(source_docx(), { nom: 'Ada' })
    const xml = new PizZip(rendered).file('word/document.xml')!.asText()
    expect(xml).toContain('Bonjour Ada')
    expect(xml).not.toContain('{{nom}}')
    const pdf = await docx_to_pdf(rendered)
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-')
  })

  it('rejects malformed sources', () => {
    expect(() => render_docx('bm90LWFkb2N4', {})).toThrow(BulkDocxError)
  })
})
