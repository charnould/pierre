import { describe, expect, it } from 'bun:test'

import * as XLSX from 'xlsx'

import { parseKnowledgeUpload } from '../../../utils/knowledge/parse-upload'

const workbook = (sheets: Array<[string, unknown[][]]>) => {
  const book = XLSX.utils.book_new()
  for (const [name, rows] of sheets) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))
}

describe('parseKnowledgeUpload', () => {
  it('accepts a header-only sheet and ignores an empty one', async () => {
    const parsed = await parseKnowledgeUpload(
      'xlsx',
      workbook([
        ['Vide', []],
        ['Données', [['nom', 'valeur']]]
      ])
    )
    expect(parsed).toMatchObject({
      kind: 'workbook',
      sheets: [{ index: 1, name: 'Données', columns: ['nom', 'valeur'], rows: [] }]
    })
  })

  it('rejects merged cells, blank headers, duplicate headers and an empty workbook', async () => {
    const merged = XLSX.utils.aoa_to_sheet([
      ['nom', 'valeur'],
      ['a', 1]
    ])
    merged['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, merged, 'Fusion')
    await expect(
      parseKnowledgeUpload(
        'xlsx',
        new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))
      )
    ).rejects.toMatchObject({ code: 'merged_cells' })

    await expect(
      parseKnowledgeUpload('xlsx', workbook([['Trous', [['nom', null]]]]))
    ).rejects.toMatchObject({ code: 'invalid_spreadsheet_header' })
    await expect(
      parseKnowledgeUpload('xlsx', workbook([['Doublons', [['Nom', 'nom']]]]))
    ).rejects.toMatchObject({ code: 'duplicate_spreadsheet_header' })
    await expect(parseKnowledgeUpload('xlsx', workbook([['Vide', [[]]]]))).rejects.toMatchObject({
      code: 'empty_workbook'
    })
  })
})
