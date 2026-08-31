import { describe, expect, test } from 'bun:test'

import PizZip from 'pizzip'

import { base64ToBytes, bytesToBase64, inspectBulkDocx, MAX_BULK_DOCX_BYTES } from './bulk-docx'

function docxWith(body: string): ArrayBuffer {
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
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p>${body}</w:p><w:sectPr/></w:body></w:document>`
  )
  const bytes = zip.generate({ type: 'uint8array' })
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('bulk DOCX', () => {
  test('détecte et trie les placeholders, même fragmentés par Word', async () => {
    const buffer = docxWith(
      '<w:r><w:t>{{solde}}</w:t></w:r><w:r><w:t>{{no</w:t></w:r><w:r><w:t>m}}</w:t></w:r>'
    )

    const result = await inspectBulkDocx('relance.docx', buffer)

    expect(result.filename).toBe('relance.docx')
    expect(result.placeholders).toEqual(['nom', 'solde'])
    expect(base64ToBytes(result.fileBase64)).toEqual(new Uint8Array(buffer))
  })

  test('refuse les boucles et conditions', async () => {
    const buffer = docxWith(
      '<w:r><w:t>{{#items}}</w:t></w:r><w:r><w:t>{{name}}</w:t></w:r><w:r><w:t>{{/items}}</w:t></w:r>'
    )

    expect(inspectBulkDocx('boucle.docx', buffer)).rejects.toThrow(
      'Les boucles et conditions ne sont pas autorisées'
    )
  })

  test('refuse extension, archive et taille invalides', async () => {
    expect(inspectBulkDocx('relance.pdf', docxWith('<w:r/>'))).rejects.toThrow('.docx')
    expect(inspectBulkDocx('relance.docx', new ArrayBuffer(4))).rejects.toThrow(
      'document Word valide'
    )
    expect(
      inspectBulkDocx('relance.docx', new ArrayBuffer(MAX_BULK_DOCX_BYTES + 1))
    ).rejects.toThrow('1 Mo')
  })

  test('convertit le base64 sans préfixe data', () => {
    const bytes = Uint8Array.from([0, 1, 2, 253, 254, 255])
    const encoded = bytesToBase64(bytes)

    expect(encoded).not.toContain('data:')
    expect(base64ToBytes(encoded)).toEqual(bytes)
  })
})
